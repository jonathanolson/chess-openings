import { Move, VerboseMove } from "./common";
import { Chess } from "chess.js";

export const getLichessMovesString = (history: Move[]): string => {
  const uciBits = [];

  const board = new Chess();

  const verboseMoveToLongForm = (move: VerboseMove) => {
    return move.promotion
      ? move.from + move.to + move.promotion
      : move.from + move.to;
  };

  for (const move of history) {
    const verboseMove = board.move(move);
    uciBits.push(verboseMoveToLongForm(verboseMove));
  }

  return encodeURIComponent(uciBits.join(","));
};
