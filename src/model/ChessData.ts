import { Fen, Move } from "./common.js";
import { Chess } from "chess.js";
import { getFen } from "./getFen.js";

export class ChessData {
  public moves: Move[];
  public moveMap: Record<Move, Fen>;
  public isWhite: boolean;
  public isCheckmate: boolean;
  public isStalemate: boolean;
  public isInsufficientMaterial: boolean;
  public numPieces: number;

  public constructor(fen: Fen) {
    const chess = new Chess(fen);
    this.moves = chess.moves();
    this.moveMap = {};
    for (const move of this.moves) {
      chess.move(move);
      const moveFen = getFen(chess);
      chess.undo();
      this.moveMap[move] = moveFen;
    }
    this.isWhite = chess.turn() === "w";
    this.isCheckmate = chess.isCheckmate();
    this.isStalemate = chess.isStalemate();
    this.isInsufficientMaterial = chess.isInsufficientMaterial();
    this.numPieces = chess
      .board()
      .flat()
      .filter((piece) => piece !== null).length;
  }
}
