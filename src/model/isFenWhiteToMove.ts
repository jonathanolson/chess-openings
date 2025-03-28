import { Fen } from "./common";

export const isFenWhiteToMove = ( fen: Fen ): boolean => {
  return fen.split(" ")[1] === "w";
};