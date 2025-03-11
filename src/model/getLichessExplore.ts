import { LichessExplore, Move } from "./common";
import { getLichessMovesString } from "./getLichessMovesString.js";

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
