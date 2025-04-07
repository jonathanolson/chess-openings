import { Fen, Move } from "./common.js";
import { Chess } from "chess.js";
import { getFen } from "./getFen.js";

const singlePieceWins = ["q", "r", "p"];

export class ChessData {
  public moves: Move[];
  public moveMap: Record<Move, Fen>;
  public isWhite: boolean;
  public isCheckmate: boolean;
  public isStalemate: boolean;
  public isInsufficientMaterial: boolean;
  public canWhiteWin: boolean;
  public canBlackWin: boolean;
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

    const whiteNonKingPieces: string[] = [];
    const blackNonKingPieces: string[] = [];

    this.numPieces = chess
      .board()
      .flat()
      .filter((piece) => {
        if (piece && piece.type !== "k") {
          (piece.color === "w" ? whiteNonKingPieces : blackNonKingPieces).push(
            piece.type,
          );
        }

        return piece !== null;
      }).length;

    // simplified logic
    this.canWhiteWin =
      whiteNonKingPieces.length > 1 ||
      (whiteNonKingPieces.length === 1 &&
        singlePieceWins.includes(whiteNonKingPieces[0]));
    this.canBlackWin =
      blackNonKingPieces.length > 1 ||
      (blackNonKingPieces.length === 1 &&
        singlePieceWins.includes(blackNonKingPieces[0]));
  }
}
