import { Chess } from "chess.js";
import { TinyEmitter } from "scenerystack/axon";
import { Fen, LichessExplore, Move, VerboseMove } from "./common";
import { assert } from "scenerystack/assert";
import { getFen } from "./getFen";
import { getLichessExplore, LichessExploreType } from "./getLichessExplore.js";
import { ChessNode, Nodes } from "./ChessNode.js";
import { ExploreStatistics } from "./ExploreStatistics.js";

export const stackLichessUpdatedEmitter = new TinyEmitter();

export class StackMove {
  public board: Chess;
  public verboseMove: VerboseMove;
  public move: Move;
  public history: Move[];
  public lichessExplore: LichessExplore | null = null;
  public exploreStatisticsMap = new Map<
    LichessExploreType,
    ExploreStatistics
  >();

  public constructor(board: Chess, previousHistory: Move[]) {
    this.board = board;

    const lastMoveHistory = board.history({ verbose: true });

    this.verboseMove = lastMoveHistory[lastMoveHistory.length - 1];
    this.move = this.verboseMove.san;
    this.history = [...previousHistory, this.move];

    if (assert) {
      const checkBoard = new Chess();
      this.history.forEach((move) => {
        assert(checkBoard.move(move), "Bad move?");
      });
      assert(getFen(checkBoard) === getFen(this.board));
    }
  }

  // TODO: remove?
  public async requestLichess(): Promise<void> {
    if (!this.lichessExplore) {
      this.lichessExplore = await getLichessExplore(this.history);
      stackLichessUpdatedEmitter.emit();
      console.log(JSON.stringify(this.lichessExplore).length);
    }
  }

  public get fen(): Fen {
    return getFen(this.board);
  }

  public getNode(nodes: Nodes): ChessNode {
    assert && assert(nodes[this.fen]);

    return nodes[this.fen];
  }

  public equals(stackMove: StackMove): boolean {
    return getFen(this.board) === getFen(stackMove.board);
  }
}
