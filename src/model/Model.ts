import { ChessNode, Nodes } from "./ChessNode.js";
import { Move, SaveState, VerboseMove } from "./common.js";
import { nodesToCompactState } from "./nodesToCompactState.js";
import { compactStateToNodes } from "./compactStateToNodes.js";
import { scanConflicts } from "./scanConflicts.js";
import {
  DerivedProperty,
  EnumerationProperty,
  Property,
  ReadOnlyProperty,
} from "scenerystack/axon";
import { Chess } from "chess.js";
import { StackMove } from "./StackMove.js";
import { getFen } from "./getFen.js";
import { initialFen } from "./initialFen.js";
import { assert } from "scenerystack/assert";
import { Random } from "scenerystack/dot";
import { Enumeration, EnumerationValue } from "scenerystack/phet-core";
import { saveAs } from "file-saver";
import { saveUserState, userProperty } from "./firebase-actions.js";
import { LichessExploreType } from "./getLichessExplore.js";

const random = new Random();

export class SaveStatus extends EnumerationValue {
  public static readonly NORMAL = new SaveStatus();
  public static readonly SAVING = new SaveStatus();
  public static readonly SUCCESS = new SaveStatus();
  public static readonly FAILURE = new SaveStatus();

  public static readonly enumeration = new Enumeration(SaveStatus);
}

export class Model {
  public readonly whiteNodes: Nodes = {};
  public readonly blackNodes: Nodes = {};

  public readonly isWhiteProperty = new Property<boolean>(true);

  public readonly nodesProperty: ReadOnlyProperty<Nodes> = new DerivedProperty(
    [this.isWhiteProperty],
    (isWhite) => (isWhite ? this.whiteNodes : this.blackNodes),
  );

  public readonly boardProperty = new Property<Chess>(new Chess());
  public readonly stackProperty = new Property<StackMove[]>([]);
  public readonly stackPositionProperty = new Property<number>(0);
  public readonly selectedStackMoveProperty: ReadOnlyProperty<StackMove | null> =
    new DerivedProperty(
      [this.stackProperty, this.stackPositionProperty],
      (stack: StackMove[], stackPosition: number) => {
        if (stackPosition > 0) {
          return stack[stackPosition - 1];
        } else {
          return null;
        }
      },
    );
  public readonly hoveredPotentialVerboseMoveProperty =
    new Property<VerboseMove | null>(null);

  public readonly isDrillProperty = new Property<boolean>(false);
  public readonly isNotDrillProperty = new DerivedProperty(
    [this.isDrillProperty],
    (isDrill) => !isDrill,
  );
  public readonly drillBaseStackProperty = new Property<StackMove[]>([]);
  public readonly drillTargetStackProperty = new Property<StackMove[]>([]);
  public readonly drillFailedProperty = new Property<boolean>(false);

  public readonly lastDrillProperty = new Property<StackMove[] | null>(null);
  public readonly useDrillWeightsProperty = new Property<boolean>(true);
  public readonly lockDrillToColorProperty = new Property<boolean>(false);

  public readonly lichessExploreTypeProperty = new Property<LichessExploreType>(
    "blitzLow",
  );

  public readonly saveStatusProperty = new EnumerationProperty(
    SaveStatus.NORMAL,
  );

  public constructor(
    saveState: SaveState,
    private readonly usedOnlineChessOpenings: boolean,
  ) {
    compactStateToNodes(this.whiteNodes, saveState.white, true);
    compactStateToNodes(this.blackNodes, saveState.black, false);

    scanConflicts(this.whiteNodes, true);
    scanConflicts(this.blackNodes, false);

    this.boardProperty.lazyLink(() => {
      this.drillFailedProperty.value = false; // Clear after any board movement
    });

    this.selectedStackMoveProperty.link((stackMove: StackMove | null) => {
      if (stackMove) {
        this.boardProperty.value = stackMove.board;
      } else {
        this.boardProperty.value = new Chess();
      }
    });
  }

  public getCompactState(): SaveState {
    return {
      white: nodesToCompactState(this.whiteNodes, true),
      black: nodesToCompactState(this.blackNodes, false),
    };
  }

  public addMoveBoard(board: Chess): void {
    const stack = this.stackProperty.value;
    const stackPosition = this.stackPositionProperty.value;

    const stackMove = new StackMove(
      board,
      stack.slice(0, stackPosition).map((subStackMove) => subStackMove.move),
    );

    // Append
    if (stackPosition === stack.length) {
      this.stackProperty.value = [...stack, stackMove];
    }
    // Toss extra info
    else if (!stack[stackPosition].equals(stackMove)) {
      this.stackProperty.value = [...stack.slice(0, stackPosition), stackMove];
    }

    this.stackPositionProperty.value = stackPosition + 1;
  }

  public setHistory(history: Move[]): void {
    this.stackPositionProperty.value = 0;

    const stack: StackMove[] = [];

    let board = new Chess();
    history.forEach((move: Move, i: number) => {
      board = new Chess(getFen(board));
      board.move(move);
      stack.push(new StackMove(board, history.slice(0, i)));
    });

    this.stackProperty.value = stack;
  }

  public setPGN(pgn: string): void {
    const board = new Chess();
    board.loadPgn(pgn);
    this.setHistory(board.history());
  }

  public goFullBack(): void {
    this.stackPositionProperty.value = 0;
  }

  public goBack(): void {
    this.stackPositionProperty.value = Math.max(
      0,
      this.stackPositionProperty.value - 1,
    );
  }

  public goForward(): void {
    this.stackPositionProperty.value = Math.min(
      this.stackProperty.value.length,
      this.stackPositionProperty.value + 1,
    );
  }

  public goFullForward(): void {
    this.stackPositionProperty.value = this.stackProperty.value.length;
  }

  public selectStackIndex(i: number): void {
    this.stackPositionProperty.value = i + 1;
  }

  public saveTree(): void {
    const stack = this.stackProperty.value;
    const stackPosition = this.stackPositionProperty.value;
    const nodes = this.nodesProperty.value;

    for (let i = 0; i < stackPosition - 1; i++) {
      const parentStackMove = stack[i];
      const childStackMove = stack[i + 1];
      const fen = getFen(parentStackMove.board);
      if (!nodes[fen] && i === 0) {
        nodes[initialFen].addMove(parentStackMove.move);
      }
      nodes[fen].addMove(childStackMove.move);
    }

    this.nodesProperty.notifyListenersStatic();
  }

  public deleteTree(): void {
    const stack = this.stackProperty.value;
    const stackPosition = this.stackPositionProperty.value;
    const nodes = this.nodesProperty.value;

    if (stackPosition > 0) {
      const stackMove = stack[stackPosition - 1];

      const childNode = stackMove.getNode(nodes);
      const parentNode =
        stackPosition > 1
          ? stack[stackPosition - 2].getNode(nodes)
          : nodes[initialFen];

      ChessNode.disconnect(parentNode, childNode);

      const cleanupNode = (node: ChessNode) => {
        if (!node.parents.length) {
          delete nodes[node.fen];
          node.children.forEach((child) => {
            ChessNode.disconnect(node, child);

            cleanupNode(child);
          });
        }
      };
      cleanupNode(childNode);
    }

    this.nodesProperty.notifyListenersStatic();
  }

  public toggleDrills(): void {
    this.isDrillProperty.value = !this.isDrillProperty.value;

    if (this.isDrillProperty.value) {
      this.drillBaseStackProperty.value = this.stackProperty.value.slice(
        0,
        this.stackPositionProperty.value,
      );

      this.startNextDrill();
    } else {
      this.drillBaseStackProperty.value = [];
      this.lastDrillProperty.value = null;
    }
  }

  public examineDrill(): void {
    const drill = this.lastDrillProperty.value;
    this.toggleDrills();

    if (drill) {
      this.stackPositionProperty.value = 0;
      this.stackProperty.value = drill;
    }
  }

  public makeDrillEasier(): void {
    const drill = this.lastDrillProperty.value;

    if (drill) {
      drill[drill.length - 1].getNode(this.nodesProperty.value).priority *= 0.5;
    }
  }

  public makeDrillHarder(): void {
    const drill = this.lastDrillProperty.value;

    if (drill) {
      drill[drill.length - 1].getNode(this.nodesProperty.value).priority *= 2;
    }
  }

  public startNextDrill(): void {
    const possibleStacks: StackMove[][] = [];

    if (
      !this.lockDrillToColorProperty.value &&
      this.drillBaseStackProperty.value.length === 0
    ) {
      // NOTE: we COULD properly distribute across everything, but this has a nice... feel.
      this.isWhiteProperty.value = Math.random() < 0.5;
    }

    const scan = (stack: StackMove[]) => {
      const lastStackMove = stack[stack.length - 1];
      const node: ChessNode = lastStackMove
        ? lastStackMove.getNode(this.nodesProperty.value)
        : this.nodesProperty.value[initialFen];
      const history = lastStackMove ? lastStackMove.history : [];
      assert && assert(node);

      if (node.moves.length) {
        node.moves.forEach((move) => {
          const board = new Chess(node.fen);
          board.move(move);
          scan([...stack, new StackMove(board, history)]);
        });
      } else {
        possibleStacks.push(stack);
      }
    };

    scan(this.drillBaseStackProperty.value);

    if (this.useDrillWeightsProperty.value) {
      this.drillTargetStackProperty.value =
        possibleStacks[
          random.sampleProbabilities(
            possibleStacks.map((stack) => {
              let prioritySum = 0;
              // Only include "our" moves
              // TODO: Only save the priority for "our" moves
              for (let i = stack.length - 2; i >= -1; i -= 2) {
                const node =
                  i >= 0
                    ? stack[i].getNode(this.nodesProperty.value)
                    : this.nodesProperty.value[initialFen];
                prioritySum += node.priority;
              }
              return prioritySum;
            }),
          )
        ];
    } else {
      this.drillTargetStackProperty.value = random.sample(possibleStacks)!;
    }

    this.stackPositionProperty.value = 0;
    this.stackProperty.value = this.drillBaseStackProperty.value.slice();
    this.stackPositionProperty.value = this.stackProperty.value.length;

    this.drillCheck();
  }

  public drillCheck(): void {
    const targetStack = this.drillTargetStackProperty.value;
    const stack = this.stackProperty.value;
    const board = this.boardProperty.value;
    const isOurTurn = (board.turn() === "w") === this.isWhiteProperty.value;

    let diffIndex = 0;
    for (
      ;
      diffIndex < Math.min(targetStack.length, stack.length);
      diffIndex++
    ) {
      if (!stack[diffIndex].equals(targetStack[diffIndex])) {
        break;
      }
    }

    // Difficulty
    if (!isOurTurn && stack.length > 0) {
      const targetNode =
        stack.length > 1
          ? targetStack[stack.length - 2].getNode(this.nodesProperty.value)
          : this.nodesProperty.value[initialFen];
      console.log(targetNode.fen);
      console.log(`before: ${targetNode.priority}`);
      if (diffIndex < stack.length) {
        // Failed
        targetNode.priority += 3;
      } else {
        // Success
        targetNode.priority *= 0.9;
      }
      console.log(`after: ${targetNode.priority}`);
    }

    if (diffIndex === targetStack.length) {
      // complete success!
      setTimeout(() => {
        this.startNextDrill();
      }, 70);
    } else if (diffIndex < stack.length) {
      // Failed at a step
      this.stackPositionProperty.value = diffIndex;
      this.stackProperty.value = stack.slice(0, diffIndex);
      this.drillFailedProperty.value = true;
    } else {
      if (!isOurTurn) {
        const move = targetStack[diffIndex].move;

        // Make the move after the timeout
        setTimeout(() => {
          // Sanity checks to help prevent this (but not guaranteed)
          if (
            this.isDrillProperty.value &&
            getFen(this.boardProperty.value) === getFen(board)
          ) {
            const afterBoard = new Chess(getFen(this.boardProperty.value));
            afterBoard.move(move);
            this.addMoveBoard(afterBoard);
          }
        }, 70);
      }
    }
  }

  public async exportState() {
    const obj = this.getCompactState();

    const json = JSON.stringify(obj);

    const string = "export default " + json + ";";

    console.log(string);

    // Do not wipe out progress online!!!
    if (!this.usedOnlineChessOpenings) {
      saveAs(
        new Blob([string], { type: "application/json;charset=utf-8" }),
        "chessOpenings.js",
      );
      this.saveStatusProperty.value = SaveStatus.NORMAL;
    } else {
      this.saveStatusProperty.value = SaveStatus.SAVING;

      try {
        await saveUserState(userProperty.value!.uid, obj);
        this.saveStatusProperty.value = SaveStatus.SUCCESS;
      } catch (e) {
        console.error("Failed to save!");
        console.error(e);
        this.saveStatusProperty.value = SaveStatus.FAILURE;
      }
    }

    return json;
  }
}
