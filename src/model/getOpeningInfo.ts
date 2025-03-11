import ecoJSON from "../data/eco.json";
import { Fen, Move } from "./common";
import { Chess } from "chess.js";
import { getFen } from "./getFen.js";

export type OpeningInfo = {
  // TODO: document
};

const json = ecoJSON as Record<Fen, OpeningInfo>;

export const getOpeningInfo = (history: Move[]): OpeningInfo => {
  const fens: Fen[] = [];

  const board = new Chess();
  const addFen = () => {
    fens.push(getFen(board));
  };

  addFen();
  for (const move in history) {
    board.move(move);
    addFen();
  }

  for (let i = fens.length - 1; i >= 0; i--) {
    const fen = fens[i];
    if (json[fen]) {
      return json[fen];
    }
  }

  // TODO: do we need to add an entryfor the default?
  throw new Error("No opening info found");
};
