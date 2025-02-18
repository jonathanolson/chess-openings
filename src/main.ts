import { QueryStringMachine } from "scenerystack/query-string-machine";
import { assert, enableAssert } from "scenerystack/assert";
import {
  DerivedProperty,
  Multilink,
  Property,
  ReadOnlyProperty,
} from "scenerystack/axon";
import { Bounds2, Random, Vector2 } from "scenerystack/dot";
import {
  Color,
  Display,
  FireListener,
  FlowBox,
  Font,
  GridBox,
  Node,
  Path,
  Rectangle,
  Text,
} from "scenerystack/scenery";
import { Chess, SQUARES } from "chess.js";
import { converter, formatHex, parse } from "culori";
import _ from "lodash";
import { Chessground } from "chessground";
import {
  AquaRadioButtonGroup,
  BooleanRectangularStickyToggleButton,
  ButtonNode,
  RectangularPushButton,
} from "scenerystack/sun";
import { saveAs } from "file-saver";
import {
  backwardSolidShape,
  chartBarSolidShape,
  dumbbellSolidShape,
  eraserSolidShape,
  fileDownloadSolidShape,
  forwardSolidShape,
  runningSolidShape,
  saveSolidShape,
  searchSolidShape,
  signOutAltSolidShape,
  stepBackwardSolidShape,
  stepForwardSolidShape,
  thumbsDownSolidShape,
  thumbsUpSolidShape,
} from "scenery-fontawesome-5";
import chessOpenings from "./data/chessOpenings";
import { Fen, LichessExplore, Move, Square, VerboseMove } from "./model/common";
import { getFen } from "./model/getFen";
import { ChessNode, Nodes } from "./model/ChessNode";
import { initialFen } from "./model/initialFen";
import { stackLichessUpdatedEmitter, StackMove } from "./model/StackMove.js";
import { copyToClipboard } from "./view/copyToClipboard.js";
import { SignInNode } from "./view/SignInNode.js";
import {
  loadUserState,
  logOut,
  saveUserState,
  userLoadedPromise,
  userPromise,
  userProperty,
} from "./model/firebase-actions.js";

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
if (process.env.NODE_ENV === "development") {
  // Enable assertions if we are in development mode
  enableAssert();
}

// @ts-expect-error defining a global
window.Chess = Chess;

(async () => {
  const options = QueryStringMachine.getAll({
    local: {
      type: "flag",
      public: true,
    },
  });

  const topDiv = document.createElement("div");
  topDiv.classList.add("blue");
  topDiv.classList.add("is2d");
  topDiv.style.display = "flex";
  topDiv.style.justifyContent = "center";

  const boardDiv = document.createElement("div");
  boardDiv.id = "board";
  boardDiv.classList.add("cg-wrap");
  boardDiv.style.width = "360px";
  boardDiv.style.height = "360px";
  topDiv.appendChild(boardDiv);

  const mainDiv = document.createElement("div");
  mainDiv.id = "main-container";
  mainDiv.style.display = "flex";
  mainDiv.style.justifyContent = "center";

  document.body.appendChild(topDiv);
  document.body.appendChild(mainDiv);

  document.body.style.backgroundColor = "#eee";

  const scene = new Node();
  const onselectstart = document.onselectstart;
  const display = new Display(scene, {
    width: 512,
    height: 512,
    backgroundColor: Color.TRANSPARENT,
    passiveEvents: true,
  });
  document.onselectstart = onselectstart; // workaround for CSS hacks

  const mainContainer = document.getElementById("main-container")!;
  // mainContainer.insertBefore( display.domElement, mainContainer.children[ 0 ] );
  mainContainer.appendChild(display.domElement);
  display.domElement.style.position = "relative";
  display.domElement.style.marginTop = "20px";

  display.updateDisplay();
  display.initializeEvents();

  // TODO: how to handle sign-in better
  display.updateOnRequestAnimationFrame(() => {
    if (scene.bounds.isValid()) {
      display.width = Math.max(Math.ceil(scene.right) + 2, 600);
      display.height = Math.ceil(scene.bottom) + 2;
    }
  });

  let usedOnlineChessOpenings = false;

  type SaveState = {
    white: CompactStateEntry[];
    black: CompactStateEntry[];
  };

  let usedChessOpenings: SaveState;
  if (options.local) {
    usedChessOpenings = chessOpenings;
  } else {
    try {
      await userLoadedPromise;
      console.log("user loaded!");
      console.log(`user ${userProperty.value ? userProperty.value.uid : null}`);

      if (!userProperty.value) {
        const signInNode = new SignInNode();

        // TODO: resizability here

        scene.addChild(signInNode);

        // TODO: cleanup here
        await userPromise;

        scene.removeChild(signInNode);

        console.log("got user");
      }

      usedChessOpenings = (await loadUserState<SaveState>(
        userProperty.value!.uid,
      ))!;

      // TODO: assert this out?

      usedOnlineChessOpenings = true;
    } catch (e) {
      console.error("load failure");
      console.error(e);
      usedChessOpenings = chessOpenings;
    }
  }

  const nicePurpleK = converter("oklab")(parse("#c87adb"))!;
  const nicePurpleHueChroma = new Vector2(nicePurpleK.a, nicePurpleK.b);
  const niceRedHueChroma = nicePurpleHueChroma.rotated(1);
  const niceRedK = {
    mode: "oklab",
    l: nicePurpleK.l,
    a: niceRedHueChroma.x,
    b: niceRedHueChroma.y,
  };

  const nicePurple = formatHex(nicePurpleK);
  // @ts-expect-error Somethings seems wrong with type desc
  const niceRed = formatHex(niceRedK);

  const random = new Random();

  const defaultLichess = {
    white: 806933,
    draws: 1035042,
    black: 580197,
    moves: [
      {
        uci: "e2e4",
        san: "e4",
        averageRating: 2400,
        white: 359986,
        draws: 463032,
        black: 270743,
        game: null,
      },
      {
        uci: "d2d4",
        san: "d4",
        averageRating: 2415,
        white: 292251,
        draws: 378141,
        black: 201722,
        game: null,
      },
      {
        uci: "g1f3",
        san: "Nf3",
        averageRating: 2422,
        white: 83257,
        draws: 106551,
        black: 56307,
        game: null,
      },
      {
        uci: "c2c4",
        san: "c4",
        averageRating: 2420,
        white: 57390,
        draws: 71291,
        black: 38861,
        game: null,
      },
      {
        uci: "g2g3",
        san: "g3",
        averageRating: 2407,
        white: 6761,
        draws: 7388,
        black: 4820,
        game: null,
      },
      {
        uci: "b2b3",
        san: "b3",
        averageRating: 2398,
        white: 3180,
        draws: 3481,
        black: 2891,
        game: null,
      },
      {
        uci: "f2f4",
        san: "f4",
        averageRating: 2348,
        white: 1755,
        draws: 2164,
        black: 2140,
        game: null,
      },
      {
        uci: "b1c3",
        san: "Nc3",
        averageRating: 2354,
        white: 1016,
        draws: 1285,
        black: 1106,
        game: null,
      },
      {
        uci: "b2b4",
        san: "b4",
        averageRating: 2331,
        white: 477,
        draws: 803,
        black: 609,
        game: null,
      },
      {
        uci: "e2e3",
        san: "e3",
        averageRating: 2359,
        white: 244,
        draws: 209,
        black: 292,
        game: null,
      },
      {
        uci: "d2d3",
        san: "d3",
        averageRating: 2332,
        white: 223,
        draws: 241,
        black: 252,
        game: null,
      },
      {
        uci: "a2a3",
        san: "a3",
        averageRating: 2356,
        white: 196,
        draws: 260,
        black: 201,
        game: null,
      },
    ],
    topGames: [],
    opening: null,
  } as unknown as LichessExplore;

  type CompactStateEntry = {
    m?: (string | number)[];
    p?: number;
  };
  type CompactState = CompactStateEntry[];

  const nodesToCompactState = (
    nodes: Nodes,
    isWhite: boolean,
  ): CompactState => {
    const nodesInOrder: ChessNode[] = [];
    Object.keys(nodes).forEach((fen) => {
      nodes[fen].serializationId = -1;
    });

    let id = 0;
    const nodesToVisit = [nodes[initialFen]];
    nodesToVisit[0].isTurnWhite = true;

    while (nodesToVisit.length) {
      const node = nodesToVisit.shift()!;

      // Only set the ID the first time
      if (node.serializationId === -1) {
        node.serializationId = id++;
        nodesInOrder.push(node);
      }

      node.children.forEach((child) => {
        child.isTurnWhite = !node.isTurnWhite;
        nodesToVisit.push(child);
      });
    }

    return nodesInOrder.map((node) => {
      const obj: CompactStateEntry = {};
      if (node.moves.length) {
        obj.m = _.flatten(
          node.moves.map((move) => {
            return [move, node.moveMap[move].serializationId];
          }),
        );
      }
      if (node.isTurnWhite === isWhite) {
        obj.p = node.priority;
      }
      return obj;
    });
  };

  const compactStateToNodes = (
    nodes: Nodes,
    obj: CompactState,
    isWhite: boolean,
  ) => {
    const fens = obj.map(() => "");
    fens[0] = initialFen;

    obj.forEach((entry, index) => {
      const fen = fens[index];
      assert && assert(fen);
      const node = new ChessNode(fen, nodes, isWhite);
      nodes[fen] = node;
      if (entry.p) {
        node.priority = entry.p;
      }
      if (entry.m) {
        for (let i = 0; i < entry.m.length; i += 2) {
          const move = entry.m[i] as string;
          const id = entry.m[i + 1] as number;

          node.moves.push(move);

          const subBoard = new Chess(fen);
          const verboseMove = subBoard.move(move);
          if (!verboseMove) {
            throw new Error("Invalid move during loading?");
          }

          fens[id] = getFen(subBoard);
        }
      }
    });

    // Connect nodes
    Object.keys(nodes).forEach((fen) => {
      const node = nodes[fen];
      // Clear out existing info!!! -- do this once
      // if ( ( new Chess( fen ).turn() === 'w' ) !== isWhite ) {
      //   node.priority = 0;
      // }
      node.moves.forEach((move) => {
        const board = new Chess(fen);
        const verboseMove = board.move(move);
        if (!verboseMove) {
          throw new Error("Invalid move during loading?");
        }
        const childNode = nodes[getFen(board)];
        ChessNode.connect(node, childNode, move);
      });
    });
  };

  const whiteNodes: Nodes = {};
  const blackNodes: Nodes = {};

  const getCompactState = () => {
    return {
      white: nodesToCompactState(whiteNodes, true),
      black: nodesToCompactState(blackNodes, false),
    };
  };

  compactStateToNodes(whiteNodes, usedChessOpenings.white, true);
  compactStateToNodes(blackNodes, usedChessOpenings.black, false);

  // @ts-expect-error defining a global
  window.whiteNodes = whiteNodes;
  // @ts-expect-error defining a global
  window.blackNodes = blackNodes;

  const scanConflicts = (nodes: Nodes, isWhite: boolean) => {
    const asciiMap: Record<string, string[]> = {};

    Object.keys(nodes).forEach((fen: Fen) => {
      const board = new Chess(fen);
      if ((board.turn() === "w") === isWhite) {
        const ascii = board.ascii();

        if (asciiMap[ascii]) {
          asciiMap[ascii].push(fen);
        } else {
          asciiMap[ascii] = [fen];
        }
      }
    });

    Object.keys(asciiMap).forEach((ascii) => {
      const fens = asciiMap[ascii];
      const fenNodes = fens.map((fen) => nodes[fen]);

      let move: Move | null = null;
      let fail = false;
      fenNodes.forEach((node) => {
        if (node.moves.length !== 1) {
          console.log(`multiple moves: ${node.moves} for ${node.fen}`);
        } else {
          if (move !== null && move !== node.moves[0]) {
            fail = true;
          }
          move = node.moves[0];
        }
      });

      if (fail) {
        console.log(`${isWhite ? "white" : "black"} mismatch`);
        console.log(ascii);
        fenNodes.forEach((node) => {
          console.log(`${node.moves} | ${node.fen}`);
          console.log(
            `  ${node
              .getHistories()
              .map((history) => history.join(","))
              .join("  ")}`,
          );
        });
      }
    });
  };
  scanConflicts(whiteNodes, true);
  scanConflicts(blackNodes, false);

  const isWhiteProperty = new Property<boolean>(true);
  const nodesProperty: ReadOnlyProperty<Nodes> = new DerivedProperty(
    [isWhiteProperty],
    (isWhite) => (isWhite ? whiteNodes : blackNodes),
  );
  const boardProperty = new Property<Chess>(new Chess());
  const stackProperty = new Property<StackMove[]>([]);
  const stackPositionProperty = new Property<number>(0);
  const selectedStackMoveProperty: ReadOnlyProperty<StackMove | null> =
    new DerivedProperty(
      [stackProperty, stackPositionProperty],
      (stack: StackMove[], stackPosition: number) => {
        if (stackPosition > 0) {
          return stack[stackPosition - 1];
        } else {
          return null;
        }
      },
    );
  const hoveredPotentialVerboseMoveProperty = new Property<VerboseMove | null>(
    null,
  );

  const isDrillProperty = new Property<boolean>(false);
  const isNotDrillProperty = new DerivedProperty(
    [isDrillProperty],
    (isDrill) => !isDrill,
  );
  const drillBaseStackProperty = new Property<StackMove[]>([]);
  const drillTargetStackProperty = new Property<StackMove[]>([]);
  const drillFailedProperty = new Property<boolean>(false);
  boardProperty.lazyLink(() => {
    drillFailedProperty.value = false; // Clear after any board movement
  });
  const lastDrillProperty = new Property<StackMove[] | null>(null);
  const useDrillWeightsProperty = new Property<boolean>(true);

  selectedStackMoveProperty.link((stackMove: StackMove | null) => {
    if (stackMove) {
      stackMove.requestLichess();

      boardProperty.value = stackMove.board;
    } else {
      boardProperty.value = new Chess();
    }
  });

  const addMoveBoard = (board: Chess) => {
    const stack = stackProperty.value;
    const stackPosition = stackPositionProperty.value;

    const stackMove = new StackMove(
      board,
      stack.slice(0, stackPosition).map((subStackMove) => subStackMove.move),
    );

    // Append
    if (stackPosition === stack.length) {
      stackProperty.value = [...stack, stackMove];
    }
    // Toss extra info
    else if (!stack[stackPosition].equals(stackMove)) {
      stackProperty.value = [...stack.slice(0, stackPosition), stackMove];
    }

    stackPositionProperty.value = stackPosition + 1;
  };

  const setHistory = (history: Move[]) => {
    stackPositionProperty.value = 0;

    const stack: StackMove[] = [];

    let board = new Chess();
    history.forEach((move: Move, i: number) => {
      board = new Chess(getFen(board));
      board.move(move);
      stack.push(new StackMove(board, history.slice(0, i)));
    });

    stackProperty.value = stack;
  };

  const setPGN = (pgn: string) => {
    const board = new Chess();
    board.loadPgn(pgn);
    setHistory(board.history());
  };

  const goFullBack = () => {
    stackPositionProperty.value = 0;
  };

  const goBack = () => {
    stackPositionProperty.value = Math.max(0, stackPositionProperty.value - 1);
  };

  const goForward = () => {
    stackPositionProperty.value = Math.min(
      stackProperty.value.length,
      stackPositionProperty.value + 1,
    );
  };

  const goFullForward = () => {
    stackPositionProperty.value = stackProperty.value.length;
  };

  const selectStackIndex = (i: number) => {
    stackPositionProperty.value = i + 1;
  };

  const saveTree = () => {
    const stack = stackProperty.value;
    const stackPosition = stackPositionProperty.value;
    const nodes = nodesProperty.value;

    for (let i = 0; i < stackPosition - 1; i++) {
      const parentStackMove = stack[i];
      const childStackMove = stack[i + 1];
      const fen = getFen(parentStackMove.board);
      if (!nodes[fen] && i === 0) {
        nodes[initialFen].addMove(parentStackMove.move);
      }
      nodes[fen].addMove(childStackMove.move);
    }

    nodesProperty.notifyListenersStatic();
  };

  const deleteTree = () => {
    const stack = stackProperty.value;
    const stackPosition = stackPositionProperty.value;
    const nodes = nodesProperty.value;

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

    nodesProperty.notifyListenersStatic();
  };

  const exportState = async () => {
    const obj = getCompactState();

    const json = JSON.stringify(obj);

    const string = "export default " + json + ";";

    console.log(string);

    // Do not wipe out progress online!!!
    if (options.local || !usedOnlineChessOpenings) {
      saveAs(
        new Blob([string], { type: "application/json;charset=utf-8" }),
        "chessOpenings.js",
      );
      downloadBaseColor.value = new Color("#aaf");
    } else {
      downloadBaseColor.value = Color.WHITE;

      try {
        await saveUserState(userProperty.value!.uid, obj);
        downloadBaseColor.value = new Color("#afa");
      } catch (e) {
        console.error("Failed to save!");
        console.error(e);
        downloadBaseColor.value = new Color("#faa");
      }
    }

    return json;
  };

  const showNodes = () => {};

  const toggleDrills = () => {
    isDrillProperty.value = !isDrillProperty.value;

    if (isDrillProperty.value) {
      drillBaseStackProperty.value = stackProperty.value.slice(
        0,
        stackPositionProperty.value,
      );

      startNextDrill();
    } else {
      drillBaseStackProperty.value = [];
      lastDrillProperty.value = null;
    }
  };

  const examineDrill = () => {
    const drill = lastDrillProperty.value;
    toggleDrills();

    if (drill) {
      stackPositionProperty.value = 0;
      stackProperty.value = drill;
    }
  };
  const makeDrillEasier = () => {
    const drill = lastDrillProperty.value;

    if (drill) {
      drill[drill.length - 1].getNode(nodesProperty.value).priority *= 0.5;
    }
  };
  const makeDrillHarder = () => {
    const drill = lastDrillProperty.value;

    if (drill) {
      drill[drill.length - 1].getNode(nodesProperty.value).priority *= 2;
    }
  };

  const startNextDrill = () => {
    const possibleStacks: StackMove[][] = [];

    const scan = (stack: StackMove[]) => {
      const lastStackMove = stack[stack.length - 1];
      const node: ChessNode = lastStackMove
        ? lastStackMove.getNode(nodesProperty.value)
        : nodesProperty.value[initialFen];
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

    scan(drillBaseStackProperty.value);

    if (useDrillWeightsProperty.value) {
      drillTargetStackProperty.value =
        possibleStacks[
          random.sampleProbabilities(
            possibleStacks.map((stack) => {
              let prioritySum = 0;
              // Only include "our" moves
              // TODO: Only save the priority for "our" moves
              for (let i = stack.length - 2; i >= -1; i -= 2) {
                const node =
                  i >= 0
                    ? stack[i].getNode(nodesProperty.value)
                    : nodesProperty.value[initialFen];
                prioritySum += node.priority;
              }
              return prioritySum;
            }),
          )
        ];
    } else {
      drillTargetStackProperty.value = random.sample(possibleStacks)!;
    }

    // Request the name
    drillTargetStackProperty.value[
      drillTargetStackProperty.value.length - 1
    ].requestLichess();

    stackPositionProperty.value = 0;
    stackProperty.value = drillBaseStackProperty.value.slice();
    stackPositionProperty.value = stackProperty.value.length;

    drillCheck();
  };

  const drillCheck = () => {
    const targetStack = drillTargetStackProperty.value;
    const stack = stackProperty.value;
    const board = boardProperty.value;
    const isOurTurn = (board.turn() === "w") === isWhiteProperty.value;

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
          ? targetStack[stack.length - 2].getNode(nodesProperty.value)
          : nodesProperty.value[initialFen];
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
        startNextDrill();
      }, 70);
    } else if (diffIndex < stack.length) {
      // Failed at a step
      stackPositionProperty.value = diffIndex;
      stackProperty.value = stack.slice(0, diffIndex);
      drillFailedProperty.value = true;
    } else {
      if (!isOurTurn) {
        const move = targetStack[diffIndex].move;

        // Make the move after the timeout
        setTimeout(() => {
          // Sanity checks to help prevent this (but not guaranteed)
          if (
            isDrillProperty.value &&
            getFen(boardProperty.value) === getFen(board)
          ) {
            const afterBoard = new Chess(getFen(boardProperty.value));
            afterBoard.move(move);
            addMoveBoard(afterBoard);
          }
        }, 70);
      }
    }
  };

  const toColor = (board: Chess) => (board.turn() === "w" ? "white" : "black");

  const ground = Chessground(boardDiv, {
    coordinates: false,
    draggable: {
      showGhost: true,
    },
    animation: {
      enabled: false,
    },
  });

  // Orientation
  isWhiteProperty.link((isWhite) => {
    ground.set({
      orientation: isWhite ? "white" : "black",
    });
  });

  // Board properties
  boardProperty.link((board) => {
    const dests = new Map();
    SQUARES.forEach((s: Square) => {
      const ms = board.moves({ square: s, verbose: true });
      ms.length &&
        dests.set(
          s,
          ms.map((m: VerboseMove) => m.to),
        );
    });

    const history = board.history({ verbose: true });
    const lastMove = history.length ? history[history.length - 1] : null;

    ground.set({
      fen: getFen(board),
      check: board.inCheck(),
      turnColor: toColor(board),
      lastMove: lastMove ? [lastMove.from, lastMove.to] : [],
      movable: {
        free: false,
        color: toColor(board),
        dests: dests,
      },
    });
  });

  // Arrows
  Multilink.multilink(
    [
      nodesProperty,
      boardProperty,
      hoveredPotentialVerboseMoveProperty,
      isDrillProperty,
      drillFailedProperty,
    ],
    (
      nodes: Nodes,
      board: Chess,
      hoverVerboseMove: VerboseMove | null,
      isDrill: boolean,
      drillFailed: boolean,
    ) => {
      const fen = getFen(board);
      const node = nodes[fen];

      const moveToShape = (move: Move, color: string) => {
        const subboard = new Chess(fen);
        const verboseMove = subboard.move(move);
        return {
          orig: verboseMove.from,
          dest: verboseMove.to,
          brush: color,
        };
      };

      const shapes = node
        ? node.moves.map((move) => moveToShape(move, "mappedMoves"))
        : [];
      if (hoverVerboseMove) {
        shapes.push({
          orig: hoverVerboseMove.from,
          dest: hoverVerboseMove.to,
          brush: "potentialMoves",
        });
      }
      const drillFailedMoves = [];
      if (drillFailed) {
        drillFailedMoves.push(
          moveToShape(
            drillTargetStackProperty.value[stackProperty.value.length].move,
            "failedMoves",
          ),
        );
      }
      ground.set({
        drawable: {
          enabled: false,
          visible: true,
          // @ts-expect-error I am not defining some brushes
          brushes: {
            mappedMoves: {
              key: "mappedMoves",
              color: "#15781B",
              opacity: 0.5,
              lineWidth: 10,
            },
            potentialMoves: {
              key: "potentialMoves",
              color: "#003088",
              opacity: 0.5,
              lineWidth: 10,
            },
            failedMoves: {
              key: "failedMoves",
              color: "#882020",
              opacity: 0.5,
              lineWidth: 10,
            },
          },
        },
      });
      ground.setShapes(isDrill ? drillFailedMoves : shapes);
    },
  );

  // Listen to chessground move events
  ground.set({
    movable: {
      events: {
        after: (from: Square | "a0", to: Square | "a0") => {
          const afterBoard = new Chess(getFen(boardProperty.value));
          afterBoard.move({ from: from, to: to });
          addMoveBoard(afterBoard);

          if (isDrillProperty.value) {
            lastDrillProperty.value = drillTargetStackProperty.value;
            drillCheck();
          }
        },
      },
    },
  });

  // Listen for the enter key press.
  document.body.addEventListener("keydown", (e) => {
    // console.log( e.keyCode );

    if (e.keyCode === 37 && canGoBackProperty.value) {
      goBack();
    }
    if (e.keyCode === 39 && canGoForwardProperty.value) {
      goForward();
    }
  });

  const unboldFont = new Font({
    family: "Helvetica, Arial, sans-serif",
    size: 12,
  });
  const boldFont = new Font({
    family: "Helvetica, Arial, sans-serif",
    size: 12,
    weight: "bold",
  });

  const createStackNode = (
    stack: StackMove[],
    stackPosition: number,
    nodes: Nodes,
  ) => {
    if (stack.length === 0) {
      return new Node();
    }
    const leftWidth = 25;
    const rightWidth = 55;
    const height = 20;

    const gridChildren: Node[] = [];

    _.range(0, Math.ceil(stack.length / 2)).forEach((i) => {
      gridChildren.push(
        new Rectangle(0, 0, leftWidth, height, {
          fill: "#fff",
          layoutOptions: {
            column: 0,
            row: i,
          },
          children: [
            new Text(i + 1, {
              centerX: leftWidth / 2,
              centerY: height / 2,
              font: boldFont,
              fill: "#888",
            }),
          ],
        }),
      );
    });

    stack.forEach((stackMove, i) => {
      const isInNodes = !!nodes[getFen(stackMove.board)];

      const fireListener = new FireListener({
        fire: () => {
          selectStackIndex(i);
        },
      });

      const fill = new DerivedProperty(
        [fireListener.looksOverProperty],
        (looksOver) => {
          return stackPosition - 1 === i
            ? isInNodes
              ? nicePurple
              : niceRed
            : looksOver
              ? "#ccc"
              : isInNodes
                ? "#ddd"
                : "#eee";
        },
      );

      gridChildren.push(
        new Rectangle(0, 0, rightWidth, height, {
          fill: fill,
          layoutOptions: {
            column: 1 + (i % 2),
            row: Math.floor(i / 2),
          },
          children: [
            new Text(stackMove.move, {
              left: 5,
              centerY: height / 2,
              font: isInNodes ? boldFont : unboldFont,
            }),
          ],
          cursor: "pointer",
          inputListeners: [fireListener],
        }),
      );
    });

    const grid = new GridBox({
      xAlign: "left",
      children: gridChildren,
    });

    return new Node({
      children: [
        Rectangle.bounds(
          grid.bounds.withMaxX(leftWidth + 2 * rightWidth).dilated(0.5),
          { stroke: "#666", lineWidth: 1 },
        ),
        grid,
      ],
    });
  };
  const stackContainer = new Node();
  Multilink.multilink(
    [stackProperty, stackPositionProperty, nodesProperty],
    (stack: StackMove[], stackPosition: number, nodes: Nodes) => {
      stackContainer.children = [createStackNode(stack, stackPosition, nodes)];
    },
  );

  const whiteBlackSwitch = new AquaRadioButtonGroup(
    isWhiteProperty,
    [
      {
        value: true,
        createNode: () => new Text("White"),
      },
      {
        value: false,
        createNode: () => new Text("Black"),
      },
    ],
    {
      orientation: "horizontal",
      spacing: 15,
      enabledProperty: isNotDrillProperty,
    },
  );

  const canGoBackProperty = new DerivedProperty(
    [stackPositionProperty],
    (stackPosition) => stackPosition >= 1,
  );
  const canGoForwardProperty = new DerivedProperty(
    [stackPositionProperty, stackProperty],
    (stackPosition: number, stack: StackMove[]) => stackPosition < stack.length,
  );

  const controlButtons = new FlowBox({
    orientation: "horizontal",
    spacing: 5,
    children: [
      new RectangularPushButton({
        content: new Path(backwardSolidShape, { fill: "black", scale: 0.03 }),
        listener: goFullBack,
        baseColor: "#fff",
        enabledProperty: canGoBackProperty,
        buttonAppearanceStrategy: ButtonNode.FlatAppearanceStrategy,
      }),
      new RectangularPushButton({
        content: new Path(stepBackwardSolidShape, {
          fill: "black",
          scale: 0.03,
        }),
        listener: goBack,
        baseColor: "#fff",
        enabledProperty: canGoBackProperty,
        buttonAppearanceStrategy: ButtonNode.FlatAppearanceStrategy,
      }),
      new RectangularPushButton({
        content: new Path(stepForwardSolidShape, {
          fill: "black",
          scale: 0.03,
        }),
        listener: goForward,
        baseColor: "#fff",
        enabledProperty: canGoForwardProperty,
        buttonAppearanceStrategy: ButtonNode.FlatAppearanceStrategy,
      }),
      new RectangularPushButton({
        content: new Path(forwardSolidShape, { fill: "black", scale: 0.03 }),
        listener: goFullForward,
        baseColor: "#fff",
        enabledProperty: canGoForwardProperty,
        buttonAppearanceStrategy: ButtonNode.FlatAppearanceStrategy,
      }),
    ],
  });

  const downloadBaseColor = new Property<Color>(Color.WHITE);

  const fileButtons = new FlowBox({
    orientation: "horizontal",
    spacing: 5,
    children: [
      new RectangularPushButton({
        content: new Path(fileDownloadSolidShape, {
          fill: "black",
          scale: 0.03,
        }),
        listener: exportState,
        baseColor: downloadBaseColor,
        buttonAppearanceStrategy: ButtonNode.FlatAppearanceStrategy,
      }),
      new RectangularPushButton({
        content: new Path(saveSolidShape, { fill: "black", scale: 0.03 }),
        listener: saveTree,
        baseColor: "#fff",
        enabledProperty: isNotDrillProperty,
        buttonAppearanceStrategy: ButtonNode.FlatAppearanceStrategy,
      }),
      new RectangularPushButton({
        content: new Path(eraserSolidShape, { fill: "black", scale: 0.03 }),
        listener: deleteTree,
        baseColor: "#fff",
        enabledProperty: isNotDrillProperty,
        buttonAppearanceStrategy: ButtonNode.FlatAppearanceStrategy,
      }),
      new RectangularPushButton({
        content: new Path(signOutAltSolidShape, { fill: "black", scale: 0.03 }),
        listener: async () => {
          await logOut();

          // TODO: show sign in!
        },
        baseColor: "#fff",
        buttonAppearanceStrategy: ButtonNode.FlatAppearanceStrategy,
      }),
    ],
  });

  const drillButtons = new FlowBox({
    orientation: "horizontal",
    spacing: 5,
    children: [
      new RectangularPushButton({
        content: new Path(runningSolidShape, { fill: "black", scale: 0.03 }),
        listener: toggleDrills,
        baseColor: "#fff",
        buttonAppearanceStrategy: ButtonNode.FlatAppearanceStrategy,
      }),
      new BooleanRectangularStickyToggleButton(useDrillWeightsProperty, {
        content: new Path(dumbbellSolidShape, { fill: "black", scale: 0.03 }),
        baseColor: "#fff",
        enabledProperty: isNotDrillProperty,
        buttonAppearanceStrategy: ButtonNode.FlatAppearanceStrategy,
      }),
      new RectangularPushButton({
        content: new Path(chartBarSolidShape, { fill: "black", scale: 0.03 }),
        listener: showNodes,
        baseColor: "#fff",
        enabledProperty: isNotDrillProperty,
        buttonAppearanceStrategy: ButtonNode.FlatAppearanceStrategy,
      }),
    ],
  });

  const fenText = new Text("", {
    fontSize: 8,
    cursor: "pointer",
    inputListeners: [
      new FireListener({
        fire: () => copyToClipboard(getFen(boardProperty.value)),
      }),
    ],
  });
  boardProperty.link((board) => {
    fenText.string = getFen(board);
  });

  const selectedOpeningNameProperty = new Property("-");
  const openingNameText = new Text(selectedOpeningNameProperty, {
    font: boldFont,
    visibleProperty: isNotDrillProperty,
  });

  const moveContainer = new FlowBox({
    orientation: "vertical",
    align: "left",
    visibleProperty: isNotDrillProperty,
  });
  const updateMoveNode = () => {
    const stackMove = selectedStackMoveProperty.value;
    const lichessExplore = stackMove
      ? stackMove.lichessExplore
      : defaultLichess;
    const fen = stackMove ? getFen(stackMove.board) : initialFen;
    const node = nodesProperty.value[fen];

    moveContainer.removeAllChildren();

    if (!node && !lichessExplore) {
      moveContainer.children = [];
      selectedOpeningNameProperty.reset();
    } else {
      const moves = [];

      if (lichessExplore) {
        const lichessMoves = lichessExplore.moves.map((move) => move.san);

        if (node) {
          // in both (lichess order)
          moves.push(
            ...lichessMoves.filter((move) => node.moves.includes(move)),
          );

          // in our moves only (our order)
          moves.push(
            ...node.moves.filter((move) => !lichessMoves.includes(move)),
          );

          // in lichess only (lichess order)
          moves.push(
            ...lichessMoves.filter((move) => !node.moves.includes(move)),
          );
        } else {
          moves.push(...lichessMoves);
        }

        if (lichessExplore.opening && lichessExplore.opening.name) {
          selectedOpeningNameProperty.value = lichessExplore.opening.name;
        } else {
          selectedOpeningNameProperty.reset();
        }
      } else {
        moves.push(...node.moves);
        selectedOpeningNameProperty.reset();
      }

      moveContainer.children = moveContainer.children.concat(
        moves.map((move, i) => {
          const lichessMove: LichessExplore["moves"][number] | null =
            lichessExplore
              ? _.find(lichessExplore.moves, (m) => m.san === move) || null
              : null;
          const isIncludedInTree = node && node.moves.includes(move);
          const moveNode = isIncludedInTree ? node.getChildNode(move) : null;

          const barWidth = 150;
          const barHeight = 15;

          const bar = new Rectangle(0, 0, barWidth, barHeight, {
            layoutOptions: { column: 1, row: 0 },
          });
          if (lichessMove) {
            const stroke = "#888";
            const whiteFill = "#fff";
            const drawFill = "#888";
            const blackFill = "#000";

            const total =
              lichessMove.white + lichessMove.black + lichessMove.draws;
            const toX = (count: number) => (barWidth * count) / total;
            if (boardProperty.value.turn() === "w") {
              bar.addChild(
                Rectangle.bounds(
                  new Bounds2(toX(0), 0, toX(lichessMove.white), barHeight),
                  {
                    fill: whiteFill,
                    stroke: stroke,
                  },
                ),
              );
              bar.addChild(
                Rectangle.bounds(
                  new Bounds2(
                    toX(lichessMove.white),
                    0,
                    toX(lichessMove.white + lichessMove.draws),
                    barHeight,
                  ),
                  {
                    fill: drawFill,
                    stroke: stroke,
                  },
                ),
              );
              bar.addChild(
                Rectangle.bounds(
                  new Bounds2(
                    toX(lichessMove.white + lichessMove.draws),
                    0,
                    toX(total),
                    barHeight,
                  ),
                  {
                    fill: blackFill,
                    stroke: stroke,
                  },
                ),
              );
            } else {
              bar.addChild(
                Rectangle.bounds(
                  new Bounds2(toX(0), 0, toX(lichessMove.black), barHeight),
                  {
                    fill: blackFill,
                    stroke: stroke,
                  },
                ),
              );
              bar.addChild(
                Rectangle.bounds(
                  new Bounds2(
                    toX(lichessMove.black),
                    0,
                    toX(lichessMove.black + lichessMove.draws),
                    barHeight,
                  ),
                  {
                    fill: drawFill,
                    stroke: stroke,
                  },
                ),
              );
              bar.addChild(
                Rectangle.bounds(
                  new Bounds2(
                    toX(lichessMove.black + lichessMove.draws),
                    0,
                    toX(total),
                    barHeight,
                  ),
                  {
                    fill: whiteFill,
                    stroke: stroke,
                  },
                ),
              );
            }
          }

          const gridBox = new GridBox({
            spacing: 10,
            children: [
              new Text(move, {
                font: isIncludedInTree ? boldFont : unboldFont,
                layoutOptions: {
                  column: 0,
                  row: 0,
                  minContentWidth: 55,
                  xAlign: "left",
                },
              }),
              bar,
              new Text(
                lichessMove
                  ? lichessMove.white + lichessMove.black + lichessMove.draws
                  : "",
                {
                  font: unboldFont,
                  layoutOptions: {
                    column: 2,
                    row: 0,
                    minContentWidth: 60,
                    xAlign: "left",
                  },
                },
              ),
              new Text(
                moveNode ? moveNode.getCumulativePriority().toFixed(2) : "-",
                {
                  font: unboldFont,
                  layoutOptions: {
                    column: 3,
                    row: 0,
                    minContentWidth: 40,
                    xAlign: "left",
                  },
                },
              ),
            ],
          });

          // TODO: handle hover to show these options easily
          const fireListener = new FireListener({
            fire: () => {
              const afterBoard = new Chess(getFen(boardProperty.value));
              afterBoard.move(move);
              addMoveBoard(afterBoard);
            },
          });

          fireListener.looksOverProperty.lazyLink((looksOver) => {
            if (looksOver) {
              hoveredPotentialVerboseMoveProperty.value = new Chess(
                getFen(boardProperty.value),
              ).move(move);
            } else {
              hoveredPotentialVerboseMoveProperty.value = null;
            }
          });

          const backgroundProperty = new DerivedProperty(
            [fireListener.looksOverProperty],
            (looksOver) => {
              const isEven = i % 2 === 0;

              if (isIncludedInTree) {
                return looksOver ? "#4af" : isEven ? "#9cf" : "#bdf";
              } else {
                return looksOver ? "#ccc" : isEven ? "#ddd" : "#eee";
              }
            },
          );

          return new Node({
            cursor: "pointer",
            inputListeners: [fireListener],
            children: [
              Rectangle.bounds(gridBox.bounds.dilatedXY(5, 2), {
                fill: backgroundProperty,
              }),
              gridBox,
            ],
          });
        }),
      );
    }
  };

  selectedStackMoveProperty.link(updateMoveNode);
  isWhiteProperty.lazyLink(updateMoveNode);
  nodesProperty.lazyLink(updateMoveNode);
  stackLichessUpdatedEmitter.addListener(updateMoveNode);

  const hasLastDrillProperty = new DerivedProperty(
    [lastDrillProperty],
    (lastDrill) => !!lastDrill,
  );

  const lastDrillOpeningNameProperty = new Property("-");
  const updateLastDrillOpeningName = () => {
    const lastDrill = lastDrillProperty.value;
    if (lastDrill) {
      const openingName =
        lastDrill[lastDrill.length - 1]?.lichessExplore?.opening.name;
      lastDrillOpeningNameProperty.value = openingName || "-";
    } else {
      lastDrillOpeningNameProperty.value = "-";
    }
  };
  lastDrillProperty.lazyLink(updateLastDrillOpeningName);
  stackLichessUpdatedEmitter.addListener(updateLastDrillOpeningName);

  const lastDrillNode = new FlowBox({
    orientation: "vertical",
    spacing: 10,
    children: [
      new Text(lastDrillOpeningNameProperty, {
        font: boldFont,
        visibleProperty: hasLastDrillProperty,
      }),
      new FlowBox({
        orientation: "horizontal",
        visibleProperty: hasLastDrillProperty,
        spacing: 5,
        children: [
          new RectangularPushButton({
            content: new Path(searchSolidShape, { fill: "black", scale: 0.03 }),
            listener: examineDrill,
            baseColor: "#fff",
            buttonAppearanceStrategy: ButtonNode.FlatAppearanceStrategy,
          }),
          new RectangularPushButton({
            content: new Path(thumbsUpSolidShape, {
              fill: "black",
              scale: 0.03,
            }),
            listener: makeDrillEasier,
            baseColor: "#fff",
            buttonAppearanceStrategy: ButtonNode.FlatAppearanceStrategy,
          }),
          new RectangularPushButton({
            content: new Path(thumbsDownSolidShape, {
              fill: "black",
              scale: 0.03,
            }),
            listener: makeDrillHarder,
            baseColor: "#fff",
            buttonAppearanceStrategy: ButtonNode.FlatAppearanceStrategy,
          }),
        ],
      }),
    ],
  });

  scene.addChild(
    new FlowBox({
      orientation: "horizontal",
      spacing: 20,
      align: "top",
      children: [
        new FlowBox({
          orientation: "vertical",
          spacing: 5,
          children: [
            whiteBlackSwitch,
            controlButtons,
            fileButtons,
            drillButtons,
            stackContainer,
          ],
        }),
        new FlowBox({
          orientation: "vertical",
          align: "left",
          spacing: 3,
          children: [fenText, openingNameText, moveContainer, lastDrillNode],
        }),
      ],
    }),
  );

  const pgnInput = document.createElement("textarea");
  pgnInput.addEventListener("input", () => {
    setPGN(pgnInput.value);
  });
  document.body.appendChild(pgnInput);

  if (window.caches) {
    (async () => {
      (await caches.open("pwa-assets")).addAll([
        "../build/chess-openings.html",
        "../contrib/chessground-examples-assets/chessground.css",
        "../contrib/chessground-examples-assets/theme.css",
        "../contrib/chessground-examples-assets/cburnett.css",
        "../contrib/chessground-examples-assets/images/board/brown.svg",
        "../manifests/chess-openings.webmanifest",
      ]);

      console.log("cached");

      console.log(`persisted: ${await navigator.storage.persisted()}`);
    })();
  }
})();
