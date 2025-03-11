import {
  CompactLichessExplore,
  getLichessExplore,
  LichessExploreType,
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

  const scan = async (
    filename: string,
    type: LichessExploreType,
    includeExpansion: boolean,
  ) => {
    const blitzLowExplore: CompactLichessExplore = JSON.parse(
      fs.readFileSync(`./src/data/${filename}.json`, "utf8"),
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
      if (includeExpansion && (whiteNode || blackNode)) {
        // Include all moves if we have a node and we are including expansions
        moves = board.moves();
      }

      // Set up the future
      for (const move of moves) {
        histories.push([...history, move]);
      }

      let explore = blitzLowExplore;

      // console.log(`checking ${history.join(" ")}`);

      const appliedMoves: Move[] = [];
      const appliedBoard = new Chess();
      for (const move of history) {
        explore = explore.m[move];
        appliedMoves.push(move);
        appliedBoard.move(move);

        if (!explore.m) {
          await sleep(5000);

          console.log(
            `${type} ${includeExpansion ? "expand " : ""}${appliedMoves.join(" ")}`,
          );

          const data = await getLichessExplore(appliedMoves, type);

          explore.m = {};

          for (const exploreMove of data.moves) {
            explore.m[exploreMove.san] = {
              d: [exploreMove.white, exploreMove.draws, exploreMove.black],
            };
          }

          fs.writeFileSync(
            `./src/data/${filename}.json`,
            JSON.stringify(blitzLowExplore),
          );
        }

        // Patch in moves that are "missing"
        const availableMoves = appliedBoard.moves();
        const missingMoves = availableMoves.filter((move) => !explore.m[move]);
        for (const missingMove of missingMoves) {
          explore.m[missingMove] = {
            d: [0, 0, 0],
          };
        }
      }
    }
  };

  await scan("lichessExploreBlitzLow", "blitzLow", false);
  await scan("lichessExploreMasters", "masters", false);
  await scan("lichessExploreBlitzHigh", "blitzHigh", false);
  await scan("lichessExploreRapidLow", "rapidLow", false);
  await scan("lichessExploreRapidHigh", "rapidHigh", false);

  await scan("lichessExploreBlitzLow", "blitzLow", true);
  await scan("lichessExploreMasters", "masters", true);
  await scan("lichessExploreBlitzHigh", "blitzHigh", true);
  await scan("lichessExploreRapidLow", "rapidLow", true);
  await scan("lichessExploreRapidHigh", "rapidHigh", true);
})();
