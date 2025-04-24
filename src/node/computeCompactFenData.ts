import {
  combineCompactLichessExplore,
  CompactLichessExplore,
  lichessExploreTypeFileMap,
  lichessExploreTypes,
} from "../model/getLichessExplore";
import fs from "fs";
import { CompactFenData, CompactFenEntry, Fen } from "../model/common.js";
import { StockfishData } from "../model/StockfishData.js";
import { initialFen } from "../model/initialFen.js";
import { ChessCache } from "../model/ChessCache.js";

const stockfishData: StockfishData = JSON.parse(
  fs.readFileSync("./src/data/stockfish.json", "utf8"),
);

const exploreTypeToShorthand = {
  blitzLow: "bl",
  blitzHigh: "bh",
  masters: "ma",
  rapidLow: "rl",
  rapidHigh: "rh",
} as const;

export const computeCompactFenData = (): CompactFenData => {
  const getEntry = (fen: Fen): CompactFenEntry => {
    const entry: CompactFenEntry = {};

    const stockfishEntry = stockfishData[fen];
    if (stockfishEntry) {
      entry.s = stockfishEntry.s;
      if (stockfishEntry.m) {
        entry.sm = "mate";
      }
    }

    return entry;
  };

  const fenData: CompactFenData = [];
  const fenMap: Record<Fen, CompactFenEntry> = {};
  const fenIndexMap: Record<Fen, number> = {};

  const ensureEntryOptional = (
    fen: Fen,
    skipIfNoEvals = false,
  ): CompactFenEntry | null => {
    let entry = fenMap[fen];
    if (!entry) {
      entry = getEntry(fen);

      const isSkipped = skipIfNoEvals && entry.s === undefined;
      if (!isSkipped) {
        fenMap[fen] = entry;
        fenIndexMap[fen] = fenData.length; // NOTE: do this BEFORE the push

        fenData.push(entry); // keep this AFTER the length lookup
      }
    }
    return entry;
  };
  const ensureEntry = (fen: Fen): CompactFenEntry => {
    return ensureEntryOptional(fen)!;
  };

  ensureEntry(initialFen);

  const chessCache = new ChessCache({
    cache: 1000000,
  });

  for (const lichessExploreType of lichessExploreTypes) {
    const file = lichessExploreTypeFileMap[lichessExploreType];

    const smallExplore: CompactLichessExplore = JSON.parse(
      fs.readFileSync(`./src/data/${file}.json`, "utf8"),
    );

    const deepExplore: CompactLichessExplore = JSON.parse(
      fs.readFileSync(`./src/data/${file}Deep.json`, "utf8"),
    );

    const rootExplore = combineCompactLichessExplore(smallExplore, deepExplore);
    const shorthand = exploreTypeToShorthand[lichessExploreType];
    // console.log(shorthand);

    const recur = (fen: Fen, explore: CompactLichessExplore): void => {
      // console.log(shorthand, fen);
      if (explore.m) {
        const entry = ensureEntry(fen);
        const chessData = chessCache.get(fen);

        if (!entry.m) {
          entry.m = {};
        }

        for (const move of Object.keys(explore.m)) {
          const nextFen: Fen = chessData.moveMap[move];

          if (!entry.m[move]) {
            // TODO: could pre-emptively prune
            ensureEntry(nextFen);
            const nextIndex = fenIndexMap[nextFen];

            entry.m[move] = {
              i: nextIndex,
            };
          }

          const exploreWdl = explore.m[move].d;

          const entryWdl = entry.m[move][shorthand] ?? [0, 0, 0];
          // NOTE: MUTATION!
          entryWdl[0] += exploreWdl[0];
          entryWdl[1] += exploreWdl[1];
          entryWdl[2] += exploreWdl[2];

          if (entryWdl[0] + entryWdl[1] + entryWdl[2] > 0) {
            entry.m[move][shorthand] = entryWdl;
          }

          recur(nextFen, explore.m[move]);
        }
      }
    };

    recur(initialFen, rootExplore);

    /*
export type CompactLichessExplore = {
  // white win, draw, black win
  d: [number, number, number];
  m?: Record<Move, CompactLichessExplore>;
};

export type CompactFenEntry = {
  // stockfish (depth 36) evals
  s?: number; // score
  sm?: "mate"; // if mate

  m?: Record<
    Move,
    {
      i?: number; // index of the move into the main list
      bl?: [number, number, number]; // blitzLow
      bh?: [number, number, number]; // blitzHigh
      ma?: [number, number, number]; // masters
      rl?: [number, number, number]; // rapidLow
      rh?: [number, number, number]; // rapidHigh
    }
  >;
};
     */
  }

  return fenData;
};
