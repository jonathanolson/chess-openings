import { Chess } from "chess.js";
import { sanitizeFen } from "./sanitizeFen.js";
import { Fen } from "./common.js";

export const getFen = (board: Chess): Fen => {
  return sanitizeFen(board.fen());
};
