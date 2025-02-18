import { LichessExplore, Move, VerboseMove } from "./common";
import { Chess } from "chess.js";

export const lichessExplore: { [key: string]: LichessExplore } = {};

export const getLichessExplore = async (history: Move[]) => {
  const key = history.join(",");
  if (lichessExplore[key]) {
    return lichessExplore[key];
  }

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

  const response = await fetch(
    `https://explorer.lichess.ovh/masters?variant=standard&play=${encodeURIComponent(uciBits.join(","))}&fen=rnbqkbnr%2Fpppppppp%2F8%2F8%2F8%2F8%2FPPPPPPPP%2FRNBQKBNR+w+KQkq+-+0+1&since=1952&until=2022&topGames=0&recentGames=0`,
  );
  lichessExplore[key] = response.json() as unknown as LichessExplore;

  return lichessExplore[key];
};
