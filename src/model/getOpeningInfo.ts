import ecoJSON from "../data/eco.json";
import { Fen, Move } from "./common";
import { Chess } from "chess.js";

export interface OpeningInfo {
  src: string;
  eco: string;
  moves: string;
  name: string;
  scid?: string;
  aliases?: {
    eco_js?: string;
    scid?: string;
  };
  isEcoRoot?: boolean;
}

const json = ecoJSON as Record<Fen, OpeningInfo>;

export const getOpeningInfo = (history: Move[]): OpeningInfo | null => {
  const fens: Fen[] = [];

  const board = new Chess();
  const addFen = () => {
    fens.push(board.fen()); // NOTE: do NOT use getFen, we need the move number
  };

  addFen();
  for (const move of history) {
    board.move(move);
    addFen();
  }

  for (let i = fens.length - 1; i >= 0; i--) {
    const fen = fens[i];
    if (json[fen]) {
      return json[fen];
    }
  }

  return null;
};
