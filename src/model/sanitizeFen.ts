import { Fen } from "./common.js";

export const sanitizeFen = (fen: Fen): Fen => {
  return `${fen.split(" ").slice(0, -2).join(" ")} 0 1`;
};
