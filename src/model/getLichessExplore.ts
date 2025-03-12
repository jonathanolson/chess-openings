import { LichessExplore, Move } from "./common";
import { getLichessMovesString } from "./getLichessMovesString.js";
import lichessExploreBlitzLow from "../data/lichessExploreBlitzLow.json";

export const lichessExplore: { [key: string]: LichessExplore } = {};

export const lichessExploreTypeMap = {
  masters: "masters?variant=standard",
  blitzLow: "lichess?variant=standard&speeds=blitz&ratings=1400,1600,1800",
  blitzHigh: "lichess?variant=standard&speeds=blitz&ratings=2000,2200,2500",
  rapidLow: "lichess?variant=standard&speeds=rapid&ratings=1400,1600,1800",
  rapidHigh: "lichess?variant=standard&speeds=rapid&ratings=2000,2200,2500",
};

export type CompactLichessExplore = {
  // white win, draw, black win
  d: [number, number, number];
  m?: Record<Move, CompactLichessExplore>;
};

export type LichessExploreType = keyof typeof lichessExploreTypeMap;

export type LichessExploreWins = {
  whiteWins: number;
  draws: number;
  blackWins: number;
};
export type LichessExploreSummary = Record<Move, LichessExploreWins>;

export const getCompactLichessExplore = (
  history: Move[],
  type: LichessExploreType,
): LichessExploreSummary | Promise<LichessExploreSummary> => {
  // TODO: do we separate this out to a different file due to the data dependency?

  if (type === "blitzLow") {
    let explore: CompactLichessExplore =
      lichessExploreBlitzLow as unknown as CompactLichessExplore;

    let success = true;
    for (const move of history) {
      if (!explore.m || !explore.m[move]) {
        success = false;
        break;
      }

      explore = explore.m[move];
    }

    if (success && explore.m) {
      const summary: LichessExploreSummary = {};

      for (const move of Object.keys(explore.m)) {
        const data = explore.m[move].d;
        summary[move] = {
          whiteWins: data[0],
          draws: data[1],
          blackWins: data[2],
        };
      }

      return summary;
    }
  }

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

      resolve(summary);
    })();
  });
};

export const getLichessExplore = async (
  history: Move[],
  type: LichessExploreType = "blitzLow",
): Promise<LichessExplore> => {
  const key = history.join(",") + "," + type;
  if (lichessExplore[key]) {
    return lichessExplore[key];
  }

  // If receive 429 (rate limited), WAIT A FULL MINUTE. Time requests so that they are not multiple at the same time.

  // https://lichess.org/api#tag/Opening-Explorer/operation/openingExplorerMaster

  // TODO: JUST do the FEN? -- but won't get opening name

  // https://explorer.lichess.ovh/masters
  // https://explorer.lichess.ovh/lichess <---
  //   needs: variant=standard,
  //   needs: speeds=,,,,   "ultraBullet" "bullet" "blitz" "rapid" "classical" "correspondence"
  //   needs: ratings=,,,,   0 1000 1200 1400 1600 1800 2000 2200 2500 each group ranges to next

  const response = await fetch(
    `https://explorer.lichess.ovh/${lichessExploreTypeMap[type]}&play=${getLichessMovesString(history)}&fen=rnbqkbnr%2Fpppppppp%2F8%2F8%2F8%2F8%2FPPPPPPPP%2FRNBQKBNR+w+KQkq+-+0+1&topGames=0&recentGames=0&moves=500`,
  );
  lichessExplore[key] = response.json() as unknown as LichessExplore;

  return lichessExplore[key];
};
