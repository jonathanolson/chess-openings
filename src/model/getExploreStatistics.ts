import { CompactFenEntry, Move } from "./common.js";
import { ExploreStatistics } from "./ExploreStatistics.js";
import { fenData } from "./fenDataSource.js";
import {
  getLichessExplore,
  LichessExploreSummary,
  LichessExploreType,
} from "./getLichessExplore.js";

export const getExploreStatistics = (
  history: Move[],
  type: LichessExploreType,
  lichessLookup = false, // if true, will return a promise back (if not a hit), otherwise will just return null
): ExploreStatistics | Promise<ExploreStatistics> | null => {
  // Traverse fen entries
  let fenEntry: CompactFenEntry | null = fenData[0];
  for (const move of history) {
    if (!fenEntry || !fenEntry.m || !fenEntry.m[move]) {
      fenEntry = null;
      break;
    }

    // TODO: why is this requiring typing?
    const index: number | undefined = fenEntry.m[move].i;

    if (index === undefined) {
      fenEntry = null;
      break;
    }

    fenEntry = fenData[index];
  }

  if (fenEntry && fenEntry.m) {
    const shorthand = (
      {
        blitzLow: "bl",
        blitzHigh: "bh",
        masters: "ma",
        rapidLow: "rl",
        rapidHigh: "rh",
      } as const
    )[type];

    const summary: LichessExploreSummary = {};

    // TODO: handle only if it has all entries?
    // TODO: handle fallbacks and nice things
    let hasAll = true;

    for (const move of Object.keys(fenEntry.m)) {
      const moveObject = fenEntry.m[move];

      if (moveObject[shorthand]) {
        const data = moveObject[shorthand];
        summary[move] = {
          whiteWins: data[0],
          draws: data[1],
          blackWins: data[2],
        };
      } else {
        hasAll = false;
      }
    }

    if (hasAll) {
      return new ExploreStatistics(summary, type, true);
    }
  }

  if (lichessLookup) {
    return new Promise((resolve) => {
      (async () => {
        const lichessExplore = await getLichessExplore(history, type);

        const summary: LichessExploreSummary = {};

        for (const move of lichessExplore.moves) {
          summary[move.san] = {
            whiteWins: move.white,
            draws: move.draws,
            blackWins: move.black,
          };
        }

        resolve(new ExploreStatistics(summary, type, false));
      })();
    });
  } else {
    return null;
  }
};
