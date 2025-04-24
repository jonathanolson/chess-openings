import { computeCompactFenData } from "../src/node/computeCompactFenData.js";
import { filterCompactFenData } from "../src/model/filterCompactFenData.js";
import { ChessNode, Nodes } from "../src/model/ChessNode.js";
import chessOpenings from "../src/data/chessOpenings.js";
import { compactStateToNodes } from "../src/model/compactStateToNodes.js";
import { scanConflicts } from "../src/model/scanConflicts.js";
// @ts-expect-error Some options
import fs from "fs";
import { initialFen } from "../src/model/initialFen.js";
import { Move } from "../src/model/common.js";

// npx tsx scripts/writeFenData.ts

console.log("fen data: computing");
const rawFenData = computeCompactFenData();

// Remove "empty" objects
console.log("fen data: initial filter");
const fullFenData = filterCompactFenData(
  rawFenData,
  (history, hasEngine, hasMoves) => hasEngine || hasMoves,
);
fs.writeFileSync("./src/data/fenDataFull.json", JSON.stringify(fullFenData));

console.log("fen data: importing chess openings");
const whiteNodes: Nodes = {};
const blackNodes: Nodes = {};

compactStateToNodes(whiteNodes, chessOpenings.white, true);
compactStateToNodes(blackNodes, chessOpenings.black, false);

scanConflicts(whiteNodes, true);
scanConflicts(blackNodes, false);

const baseWhite = whiteNodes[initialFen];
const baseBlack = blackNodes[initialFen];

const getNodeFromHistory = (node: ChessNode | null, history: Move[]) => {
  for (const move of history) {
    if (node) {
      node = node.moveMap[move] ?? null;
    }
  }

  return node;
};

{
  console.log("fen data: skeleton filter");
  const skeletonFenData = filterCompactFenData(
    fullFenData,
    (history, hasEngine, hasMoves) => {
      if (!hasEngine && !hasMoves) {
        return false;
      }

      for (const baseNode of [baseWhite, baseBlack]) {
        const node = getNodeFromHistory(baseNode, history);

        // Only return ones with children (so we can reach everything with lichess explore)
        if (node && node.children.length) {
          return true;
        }
      }

      return false;
    },
  );
  fs.writeFileSync(
    "./src/data/fenDataSkeleton.json",
    JSON.stringify(skeletonFenData),
  );
}

{
  console.log("fen data: base filter");
  const baseFenData = filterCompactFenData(
    fullFenData,
    (history, hasEngine, hasMoves) => {
      if (!hasEngine && !hasMoves) {
        return false;
      }

      for (const baseNode of [baseWhite, baseBlack]) {
        const node = getNodeFromHistory(baseNode, history);

        // Only return ones with children (so we can reach everything with lichess explore)
        if (node) {
          return true;
        }
      }

      return false;
    },
  );
  fs.writeFileSync("./src/data/fenDataBase.json", JSON.stringify(baseFenData));
}
