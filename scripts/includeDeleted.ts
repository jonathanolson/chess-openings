import chessOpenings from "../src/data/chessOpenings.js";
import type { ChessNode, Nodes } from "../src/model/ChessNode.js";
import { compactStateToNodes } from "../src/model/compactStateToNodes.js";
import { scanConflicts } from "../src/model/scanConflicts.js";
// @ts-expect-error Some options
import fs from "fs";
import type { Move, SaveState } from "../src/model/common.js";
import { initialFen } from "../src/model/initialFen.js";
import { getSimplePGN } from "../src/model/getSimplePGN.js";
import { nodesToCompactState } from "../src/model/nodesToCompactState.js";

// npx tsx scripts/includeDeleted.ts <file>

const filename = process.argv[2];

(async () => {
  const whiteNodes: Nodes = {};
  const blackNodes: Nodes = {};

  console.log("current white");
  compactStateToNodes(whiteNodes, chessOpenings.white, true);
  console.log("current black");
  compactStateToNodes(blackNodes, chessOpenings.black, false);

  scanConflicts(whiteNodes, true);
  scanConflicts(blackNodes, false);

  const json: SaveState = JSON.parse(
    fs.readFileSync(`./src/data/${filename}`, "utf8"),
  );

  const oldWhiteNodes: Nodes = {};
  const oldBlackNodes: Nodes = {};

  console.log("old white");
  compactStateToNodes(oldWhiteNodes, json.white, true, true);
  console.log("old black");
  compactStateToNodes(oldBlackNodes, json.black, false, true);

  scanConflicts(oldWhiteNodes, true);
  scanConflicts(oldBlackNodes, false);

  const scan = (nodes: Nodes, oldNodes: Nodes, isWhite: boolean) => {
    const rootNode = nodes[initialFen];
    const oldRootNode = oldNodes[initialFen];

    type Match = {
      node: ChessNode;
      oldNode: ChessNode;
    };
    // const matches: Match[] = [];

    const recur = (
      node: ChessNode,
      oldNode: ChessNode,
      isTurnWhite: boolean,
      history: Move[],
    ) => {
      // matches.push( {
      //   node,
      //   oldNode,
      // });

      const matchedMoves = oldNode.moves.filter((move) =>
        node.moves.includes(move),
      );
      const unmatchedMoves = oldNode.moves.filter(
        (move) => !node.moves.includes(move),
      );

      if (isTurnWhite === isWhite) {
        if (node.moves.length === 0) {
          if (!unmatchedMoves.length) {
            console.log(
              isWhite ? "white" : "black",
              `self move missing at ${getSimplePGN(history)}`,
            );
          }
        }
      } else {
        for (const unmatchedMove of unmatchedMoves) {
          console.log(
            isWhite ? "white" : "black",
            `broken opponent-move branch at ${getSimplePGN([...history, unmatchedMove])}`,
          );

          node.addMove(unmatchedMove);
          const improvedNode = node.moveMap[unmatchedMove];
          improvedNode.priority = oldNode.moveMap[unmatchedMove].priority;

          const visit = (
            subNewNode: ChessNode,
            subOldNode: ChessNode,
            history: Move[],
          ) => {
            if (subOldNode.moves.length === 0) {
              // leaf
              console.log("  ", getSimplePGN(history));
            }

            for (const move of subOldNode.moves) {
              if (!subNewNode.moves.includes(move)) {
                if (
                  subNewNode.isWhiteTurn() === isWhite &&
                  subNewNode.moves.length > 0
                ) {
                  throw new Error("Do not create duplicate self moves");
                }

                subNewNode.addMove(move);
                subNewNode.moveMap[move].priority =
                  subOldNode.moveMap[move].priority;
              }

              visit(subNewNode.moveMap[move], subOldNode.moveMap[move], [
                ...history,
                move,
              ]);
            }
          };

          visit(improvedNode, oldNode.moveMap[unmatchedMove], [
            ...history,
            unmatchedMove,
          ]);
        }
      }

      matchedMoves.forEach((move) => {
        const subNode = node.moveMap[move];
        const subOldNode = oldNode.moveMap[move];
        recur(subNode, subOldNode, !isTurnWhite, [...history, move]);
      });
    };
    recur(rootNode, oldRootNode, true, []);
  };

  scan(whiteNodes, oldWhiteNodes, true);
  scan(blackNodes, oldBlackNodes, false);

  fs.writeFileSync(
    "./src/data/fixedOpenings.json",
    JSON.stringify({
      white: nodesToCompactState(whiteNodes, true),
      black: nodesToCompactState(blackNodes, false),
    }),
  );
})();
