import { Fen, Move } from "./common";
import { Chess } from "chess.js";
import { getFen } from "./getFen.js";
import { initialFen } from "./initialFen.js";
import _ from "lodash";

export type Nodes = { [key: Fen]: ChessNode };
export type SerializedNode = { m: Move[]; p: number };
export type SerializedNodes = { [key: Fen]: SerializedNode };

export class ChessNode {
  // saved
  public fen: Fen;
  public moves: Move[] = [];

  // not saved
  public nodes: Nodes;
  public isWhite: boolean;
  public isTurnWhite!: boolean;

  public serializationId!: number;

  // not saved - set with connect/disconnect after construction
  public children: ChessNode[] = [];
  public parents: ChessNode[] = [];
  public moveMap: Record<Move, ChessNode> = {};

  public priority = 1;

  public constructor(fen: Fen, nodes: Nodes, isWhite: boolean) {
    this.fen = fen;
    this.nodes = nodes;
    this.isWhite = isWhite;

    // TODO: name
  }

  public addMove(move: Move): void {
    if (this.moves.includes(move)) {
      return;
    }

    this.moves.push(move);

    const board = new Chess(this.fen);
    const verboseMove = board.move(move);
    if (!verboseMove) {
      throw new Error("invalid move");
    }

    const newTurnIsWhite = board.turn() === "w";

    const fen = getFen(board);

    if (!this.nodes[fen]) {
      this.nodes[fen] = new ChessNode(fen, this.nodes, this.isWhite);
      this.nodes[fen].priority = newTurnIsWhite === this.isWhite ? 1 : 0;
    }

    ChessNode.connect(this, this.nodes[fen], move);
  }

  public getChildMove(child: ChessNode): Move {
    if (!this.children.includes(child)) {
      throw new Error("Child not found");
    }

    for (const move of Object.keys(this.moveMap)) {
      if (this.moveMap[move] === child) {
        return move;
      }
    }

    throw new Error("Move not found");
  }

  public getChildNode(move: Move): ChessNode {
    if (!this.moves.includes(move)) {
      throw new Error("Move not found");
    }

    const board = new Chess(this.fen);
    const verboseMove = board.move(move);
    if (!verboseMove) {
      throw new Error("invalid move");
    }

    const fen = getFen(board);

    return this.nodes[fen];
  }

  public serialize(): SerializedNode {
    return {
      m: this.moves,
      p: this.priority,
    };
  }

  public getHistories(): Move[][] {
    const histories: Move[][] = [];
    const scan = (node: ChessNode, history: Move[]) => {
      if (node === this) {
        histories.push(history);
      }
      if (node.moves.length) {
        node.moves.forEach((move) => {
          const board = new Chess(node.fen);
          board.move(move);
          scan(this.nodes[getFen(board)], [...history, move]);
        });
      }
    };

    scan(this.nodes[initialFen], []);

    return histories;
  }

  public getCumulativePriority(): number {
    const nodes: ChessNode[] = [];
    const scan = (node: ChessNode) => {
      nodes.push(node);

      node.children.forEach((child) => scan(child));
    };
    scan(this);

    return _.sum(_.uniq(nodes).map((node) => node.priority));
  }

  public static connect(parent: ChessNode, child: ChessNode, move: Move): void {
    parent.children.push(child);
    child.parents.push(parent);
    parent.moveMap[move] = child;
  }

  // NOTE: This removes the move also!
  public static disconnect(parent: ChessNode, child: ChessNode): void {
    const move = parent.getChildMove(child);

    parent.children = parent.children.filter((node) => node !== child);
    child.parents = child.parents.filter((node) => node !== parent);
    delete parent.moveMap[move];
    parent.moves = parent.moves.filter((m) => m !== move);
  }

  public static deserialize(
    fen: Fen,
    nodes: Nodes,
    obj: SerializedNode,
    isWhite: boolean,
  ): ChessNode {
    const node = new ChessNode(fen, nodes, isWhite);
    node.moves = obj.m || [];
    if (obj.p) {
      node.priority = obj.p;
    }
    return node;
  }
}
