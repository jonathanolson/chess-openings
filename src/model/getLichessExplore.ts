import { LichessExplore, Move } from "./common";
import { getLichessMovesString } from "./getLichessMovesString.js";
import _ from "lodash";

export const lichessExplore: { [key: string]: LichessExplore } = {};

export const lichessExploreTypeMap = {
  masters: "masters?variant=standard",
  blitzLow: "lichess?variant=standard&speeds=blitz&ratings=1400,1600,1800",
  blitzHigh: "lichess?variant=standard&speeds=blitz&ratings=2000,2200,2500",
  rapidLow: "lichess?variant=standard&speeds=rapid&ratings=1400,1600,1800",
  rapidHigh: "lichess?variant=standard&speeds=rapid&ratings=2000,2200,2500",
};

export const lichessExploreTypes = Object.keys(
  lichessExploreTypeMap,
) as LichessExploreType[];

export const lichessExploreTypeFileMap = {
  blitzLow: "lichessExploreBlitzLow",
  blitzHigh: "lichessExploreBlitzHigh",
  masters: "lichessExploreMasters",
  rapidLow: "lichessExploreRapidLow",
  rapidHigh: "lichessExploreRapidHigh",
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

export const getExploreMoveCount = (
  explore: CompactLichessExplore,
  move: Move,
) =>
  explore.m && explore.m[move]
    ? explore.m[move].d[0] + explore.m[move].d[1] + explore.m[move].d[2]
    : 0;

// Takes statistics from A first
export const combineCompactLichessExplore = (
  a: CompactLichessExplore,
  b: CompactLichessExplore,
): CompactLichessExplore => {
  const result: CompactLichessExplore = {
    d: a.d,
  };

  if (a.m) {
    if (b.m) {
      const moves = _.uniq([...Object.keys(a.m), ...Object.keys(b.m)]);

      const m: Record<Move, CompactLichessExplore> = {};

      for (const move of moves) {
        if (a.m[move] && b.m[move]) {
          m[move] = combineCompactLichessExplore(a.m[move], b.m[move]);
        } else if (a.m[move]) {
          m[move] = a.m[move];
        } else {
          m[move] = b.m[move];
        }
      }
      result.m = m;
    } else {
      result.m = a.m;
    }
  } else if (b.m) {
    result.m = b.m;
  }

  return result;
};
