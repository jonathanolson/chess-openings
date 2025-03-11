import {
  CompactLichessExplore,
  getLichessExplore,
} from "../src/model/getLichessExplore.js";
import chessOpenings from "../src/data/chessOpenings.js";
import { Nodes } from "../src/model/ChessNode.js";
import { compactStateToNodes } from "../src/model/compactStateToNodes.js";
import { scanConflicts } from "../src/model/scanConflicts.js";
// @ts-expect-error Some options
import _ from "lodash";
// @ts-expect-error Some options
import fs from "fs";
import { Move } from "../src/model/common.js";
import { Chess } from "chess.js";
import { sleep } from "./sleep.js";
import { getFen } from "../src/model/getFen.js";

// npx tsx scripts/cacheLichessExplore.ts

(async () => {
  const whiteNodes: Nodes = {};
  const blackNodes: Nodes = {};

  compactStateToNodes(whiteNodes, chessOpenings.white, true);
  compactStateToNodes(blackNodes, chessOpenings.black, false);

  scanConflicts(whiteNodes, true);
  scanConflicts(blackNodes, false);

  const blitzLowExplore: CompactLichessExplore = JSON.parse(
    fs.readFileSync("./src/data/lichessExploreBlitzLow.json", "utf8"),
  );

  const histories: Move[][] = [[]];

  while (histories.length) {
    const history = histories.shift();

    const board = new Chess();
    history.forEach((move) => {
      board.move(move);
    });

    const fen = getFen(board);

    const whiteNode = whiteNodes[fen];
    const blackNode = blackNodes[fen];

    let moves: Move[] = [];

    if (whiteNode) {
      moves.push(...whiteNode.moves);
    }
    if (blackNode) {
      moves.push(...blackNode.moves);
    }
    moves = _.uniq(moves);

    // Set up the future
    for (const move of moves) {
      histories.push([...history, move]);
    }

    let explore = blitzLowExplore;
    for (const move of history) {
      explore = explore.m[move];
    }

    if (!explore.m) {
      await sleep(5000);

      console.log(`${history.join(" ")}`);

      const data = await getLichessExplore(history);

      explore.m = {};

      for (const exploreMove of data.moves) {
        explore.m[exploreMove.san] = {
          d: [exploreMove.white, exploreMove.draws, exploreMove.black],
        };
      }

      fs.writeFileSync(
        "./src/data/lichessExploreBlitzLow.json",
        JSON.stringify(blitzLowExplore),
      );
    }
  }
})();
