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
): number => {
  if (entry.m === "mate") {
    return entry.s >= 0 ? 100 : 0;
  } else {
    return centipawnsToWinPercentage(entry.s);
  }
};

export const stockfishEntryToString = (entry: StockfishEntry): string => {
  if (entry.m === "mate") {
    if (entry.s === 0) {
      return "#";
    } else {
      // TODO: verify that this is correct?
      return `#${Math.ceil(entry.s / 2)}`;
    }
  } else if (entry.s === 0) {
    return "0";
  } else {
    // 3 decimal places shows full precision
    return `${entry.s > 0 ? "+" : ""}${toFixed(entry.s, 3)}`;
  }
};
