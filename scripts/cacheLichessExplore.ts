import {
  CompactLichessExplore,
  getLichessExplore,
  combineCompactLichessExplore,
  LichessExploreType,
} from "../src/model/getLichessExplore.js";
import chessOpenings from "../src/data/chessOpenings.js";
import type { Nodes } from "../src/model/ChessNode.js";
import { compactStateToNodes } from "../src/model/compactStateToNodes.js";
import { scanConflicts } from "../src/model/scanConflicts.js";
// @ts-expect-error Some options
import _ from "lodash";
// @ts-expect-error Some options
import fs from "fs";
import type { Move } from "../src/model/common.js";
import { Chess } from "chess.js";
import { sleep } from "./sleep.js";
import { getFen } from "../src/model/getFen.js";

// npx tsx scripts/cacheLichessExplore.ts

const ONLY_BLITZ_LOW = true;
const ONLY_UNDER_HISTORY: Move[] = [];

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
    if (ONLY_BLITZ_LOW && type !== "blitzLow") {
      return;
    }

    const mainExplore: CompactLichessExplore = JSON.parse(
      fs.readFileSync(`./src/data/${filename}.json`, "utf8"),
    );

    // console.log("optimizing");
    // {
    //   const recur = (explore: CompactLichessExplore, keys: Move[]) => {
    //     if (explore.m) {
    //       const moves = Object.keys(explore.m);
    //
    //       for (const move of moves) {
    //         const subExplore = explore.m[move];
    //
    //         if (
    //           !subExplore.m &&
    //           subExplore.d[0] === 0 &&
    //           subExplore.d[1] === 0 &&
    //           subExplore.d[2] === 0
    //         ) {
    //           console.log(`removing ${keys.join(" ")} ${move}`);
    //           delete explore.m[move];
    //         } else {
    //           recur(subExplore, [...keys, move]);
    //         }
    //       }
    //     }
    //   };
    //   recur(mainExplore, []);
    // }
    // save();

    const histories: Move[][] = [[]];

    while (histories.length) {
      const history = histories.shift();

      let skip = false;
      for (
        let i = 0;
        i < history.length && i < ONLY_UNDER_HISTORY.length;
        i++
      ) {
        if (ONLY_UNDER_HISTORY[i] !== history[i]) {
          skip = true;
        }
      }
      if (skip) {
        continue;
      }

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

      let explore = mainExplore;

      // console.log(`checking ${history.join(" ")}`);

      const appliedMoves: Move[] = [];
      const appliedBoard = new Chess();

      const tryFetch = async () => {
        if (!explore.m) {
          await sleep(5000);

          console.log(
            `[${type}] ${includeExpansion ? "expand " : ""}${appliedMoves.join(" ")}`,
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
            JSON.stringify(mainExplore),
          );
        }
      };

      await tryFetch();

      for (const move of history) {
        // Fill in missing spots lazily (as blanks)
        if (!explore.m[move]) {
          explore.m[move] = {
            d: [0, 0, 0],
          };
        }

        explore = explore.m[move];
        appliedMoves.push(move);
        appliedBoard.move(move);

        await tryFetch();
      }
    }
  };

  const combineInto = (smallFile: string, deepFile: string) => {
    console.log(`combining ${smallFile} into ${deepFile}`);

    const smallExplore: CompactLichessExplore = JSON.parse(
      fs.readFileSync(`./src/data/${smallFile}.json`, "utf8"),
    );

    const deepExplore: CompactLichessExplore = JSON.parse(
      fs.readFileSync(`./src/data/${deepFile}.json`, "utf8"),
    );

    const combinedExplore = combineCompactLichessExplore(
      smallExplore,
      deepExplore,
    );

    fs.writeFileSync(
      `./src/data/${deepFile}.json`,
      JSON.stringify(combinedExplore),
    );
  };

  await scan("lichessExploreBlitzLow", "blitzLow", false);
  await scan("lichessExploreMasters", "masters", false);
  await scan("lichessExploreBlitzHigh", "blitzHigh", false);
  await scan("lichessExploreRapidLow", "rapidLow", false);
  await scan("lichessExploreRapidHigh", "rapidHigh", false);

  combineInto("lichessExploreBlitzLow", "lichessExploreBlitzLowDeep");
  combineInto("lichessExploreMasters", "lichessExploreMastersDeep");
  combineInto("lichessExploreBlitzHigh", "lichessExploreBlitzHighDeep");
  combineInto("lichessExploreRapidLow", "lichessExploreRapidLowDeep");
  combineInto("lichessExploreRapidHigh", "lichessExploreRapidHighDeep");

  await scan("lichessExploreBlitzLowDeep", "blitzLow", true);
  await scan("lichessExploreMastersDeep", "masters", true);
  await scan("lichessExploreBlitzHighDeep", "blitzHigh", true);
  await scan("lichessExploreRapidLowDeep", "rapidLow", true);
  await scan("lichessExploreRapidHighDeep", "rapidHigh", true);
})();
