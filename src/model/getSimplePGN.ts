import { Move } from "./common.js";

export const getSimplePGN = (moves: Move[]): string => {
  let string = "";
  for (let i = 0; i < moves.length; i++) {
    if (i > 0) {
      string += " ";
    }
    if (i % 2 === 0) {
      string += `${Math.floor(i / 2) + 1}. ${moves[i]}`;
    } else {
      string += moves[i];
    }
  }

  return string;
};
