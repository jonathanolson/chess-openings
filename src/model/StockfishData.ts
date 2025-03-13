import { toFixed } from "scenerystack/dot";
import { Fen } from "./common";

export type StockfishEntry = {
  d: number; // depth
  s: number; // score
  m?: "mate"; // if mate
};
export type StockfishData = Record<Fen, StockfishEntry>;

// See https://lichess.org/forum/lichess-feedback/which-centipawn-calculation-algorithm-is-lichess-currently-using
export const centipawnsToWinPercentage = (centipawns: number): number =>
  50 + 50 * (2 / (1 + Math.exp(-0.00368208 * centipawns)) - 1);

export const stockfishEntryToWinPercentage = (
  entry: StockfishEntry,
  isWhite: boolean,
): number => {
  const score = isWhite ? entry.s : -entry.s;

  if (entry.m === "mate") {
    return score >= 0 ? 100 : 0;
  } else {
    return centipawnsToWinPercentage(score);
  }
};

export const stockfishEntryToString = (
  entry: StockfishEntry,
  isWhite: boolean,
): string => {
  const score = isWhite ? entry.s : -entry.s;

  if (entry.m === "mate") {
    if (score === 0) {
      return "#";
    } else {
      // TODO: verify that this is correct?
      return `#${score > 0 ? Math.ceil(score / 2) : Math.floor(score / 2)}`;
    }
  } else if (score === 0) {
    return "0";
  } else {
    // 3 decimal places shows full precision
    return `${score > 0 ? "+" : ""}${toFixed(score / 100, 2)}`;
  }
};
