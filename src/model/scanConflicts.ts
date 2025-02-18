import { Chess } from "chess.js";
import { Nodes } from "./ChessNode.js";
import { Fen, Move } from "./common.js";

export const scanConflicts = (nodes: Nodes, isWhite: boolean) => {
  const asciiMap: Record<string, string[]> = {};

  Object.keys(nodes).forEach((fen: Fen) => {
    const board = new Chess(fen);
    if ((board.turn() === "w") === isWhite) {
      const ascii = board.ascii();

      if (asciiMap[ascii]) {
        asciiMap[ascii].push(fen);
      } else {
        asciiMap[ascii] = [fen];
      }
    }
  });

  Object.keys(asciiMap).forEach((ascii) => {
    const fens = asciiMap[ascii];
    const fenNodes = fens.map((fen) => nodes[fen]);

    let move: Move | null = null;
    let fail = false;
    fenNodes.forEach((node) => {
      if (node.moves.length !== 1) {
        console.log(`multiple moves: ${node.moves} for ${node.fen}`);
      } else {
        if (move !== null && move !== node.moves[0]) {
          fail = true;
        }
        move = node.moves[0];
      }
    });

    if (fail) {
      console.log(`${isWhite ? "white" : "black"} mismatch`);
      console.log(ascii);
      fenNodes.forEach((node) => {
        console.log(`${node.moves} | ${node.fen}`);
        console.log(
          `  ${node
            .getHistories()
            .map((history) => history.join(","))
            .join("  ")}`,
        );
      });
    }
  });
};
