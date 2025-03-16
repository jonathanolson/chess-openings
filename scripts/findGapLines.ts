import chessOpenings from "../src/data/chessOpenings.js";
import { ChessNode, Nodes } from "../src/model/ChessNode.js";
import { compactStateToNodes } from "../src/model/compactStateToNodes.js";
import { scanConflicts } from "../src/model/scanConflicts.js";
// @ts-expect-error Some options
import _ from "lodash";
// @ts-expect-error Some options
import fs from "fs";
import { Fen, Move } from "../src/model/common.js";
import { Chess } from "chess.js";
import { getFen } from "../src/model/getFen.js";
import type { StockfishData } from "../src/model/StockfishData.js";
import {
  CompactLichessExplore,
  getExploreMoveCount,
} from "../src/model/getLichessExplore.js";
import { getSimplePGN } from "../src/model/getSimplePGN.js";

// npx tsx scripts/findGapLines.ts <type> <color> <history...>

const lichessType = process.argv[2];
const startingColor = process.argv[3] ?? null;
const startingHistory = process.argv.slice(4);

const fileSuffix = {
  blitzLow: "BlitzLow",
  blitzHigh: "BlitzHigh",
  rapidLow: "RapidLow",
  rapidHigh: "RapidHigh",
  masters: "Masters",
}[lichessType];

if (!fileSuffix) {
  console.error(`Invalid type: ${lichessType}`);
}

if (
  startingColor !== "white" &&
  startingColor !== "black" &&
  startingColor !== null
) {
  throw new Error(`Invalid color: ${startingColor}`);
}

(async () => {
  const whiteNodes: Nodes = {};
  const blackNodes: Nodes = {};

  compactStateToNodes(whiteNodes, chessOpenings.white, true);
  compactStateToNodes(blackNodes, chessOpenings.black, false);

  scanConflicts(whiteNodes, true);
  scanConflicts(blackNodes, false);

  console.log("color", startingColor);
  console.log("pgn", getSimplePGN(startingHistory));

  type MoveEntry = {
    isWhite: boolean;
    histories: Move[][];
    baseFen: Fen;
    move: Move;
    probability: number;
  };

  const mainExplore: CompactLichessExplore = JSON.parse(
    fs.readFileSync(`./src/data/lichessExplore${fileSuffix}.json`, "utf8"),
  );
  const stockfish: StockfishData = JSON.parse(
    fs.readFileSync("./src/data/stockfish.json", "utf8"),
  );

  const entries: MoveEntry[] = [];

  const runNodes = (nodes: Nodes, isWhite: boolean) => {
    const historiesMap = ChessNode.getHistoriesMap(nodes);

    for (const chessNode of Object.values(nodes)) {
      // Ignore nodes for our turn (we likely already computed these, etc.)
      if (isWhite === (new Chess(chessNode.fen).turn() === "w")) {
        continue;
      }

      let baseProbability = 0;
      let explores: CompactLichessExplore[] = [];

      const histories = historiesMap.get(chessNode)!.filter((history) => {
        if (startingHistory.length > history.length) {
          return false;
        }
        for (let i = 0; i < startingHistory.length; i++) {
          if (startingHistory[i] !== history[i]) {
            return false;
          }
        }
        return true;
      });

      for (const history of histories) {
        let explore: CompactLichessExplore | null = mainExplore;
        let board = new Chess();
        let probability = 1;

        for (let i = 0; i < history.length; i++) {
          const move = history[i];

          let moveProbability = 0; // default to zero probability if we don't have data
          if (explore && explore.m) {
            const getMoveCount = (move: Move) =>
              explore.m && explore.m[move]
                ? explore.m[move].d[0] +
                  explore.m[move].d[1] +
                  explore.m[move].d[2]
                : 0;

            const totalMoveCount = Object.keys(explore.m).reduce(
              (sum, move) => sum + getMoveCount(move),
              0,
            );
            if (totalMoveCount > 0) {
              moveProbability = getMoveCount(move) / totalMoveCount;
            }
          }

          // Only count probability for OPPONENT moves (at least when getting history of the chess node
          if (isWhite !== (board.turn() === "w")) {
            // TODO: more efficient way
            probability *= moveProbability;
          }

          board.move(move);
          explore = explore?.m?.[move] ?? null;
        }

        baseProbability += probability;
        if (explore) {
          explores.push(explore);
        }
      }

      if (baseProbability === 0) {
        continue;
      }

      // console.log(histories[0], baseProbability);

      let totalNextCount = 0;
      for (const explore of explores) {
        if (explore.m) {
          for (const move of Object.keys(explore.m)) {
            totalNextCount += getExploreMoveCount(explore, move);
          }
        }
      }

      if (totalNextCount === 0) {
        continue;
      }

      const nextMoves = new Chess(chessNode.fen).moves();
      for (const move of nextMoves) {
        // Ignore moves that we have already predicted
        if (chessNode.moves.includes(move)) {
          continue;
        }

        const nextBoard = new Chess(chessNode.fen);
        nextBoard.move(move);
        const nextFen = getFen(nextBoard);

        // If it will be included directly, exclude this!
        if (nodes[nextFen]) {
          continue;
        }

        let partialNextProbability = 1 / nextMoves.length;

        if (totalNextCount > 0) {
          let moveCount = 0;
          for (const explore of explores) {
            if (explore && explore.m) {
              moveCount += getExploreMoveCount(explore, move);
            }
          }
          partialNextProbability = moveCount / totalNextCount;
        }

        if (partialNextProbability === 0) {
          continue;
        }

        const nextProbability = baseProbability * partialNextProbability;

        entries.push({
          isWhite: isWhite,
          histories: histories,
          baseFen: chessNode.fen,
          move,
          probability: nextProbability,
        });
      }
    }
  };
  if (startingColor !== "black") {
    runNodes(whiteNodes, true);
  }
  if (startingColor !== "white") {
    runNodes(blackNodes, false);
  }

  const sortedEntries = _.sortBy(entries, (entry) => -entry.probability);

  // TODO: how many to print out? all?

  for (const entry of sortedEntries.slice(0, 30)) {
    let probabilityString = entry.probability.toFixed(7);
    if (entry !== sortedEntries[0]) {
      probabilityString = probabilityString.replace(
        /(\.)(0+)(?=[1-9])/,
        (_, dot, zeros) => dot + " ".repeat(zeros.length),
      );
    }

    console.log(
      entry.isWhite ? "white" : "black",
      probabilityString,
      getSimplePGN([...entry.histories[0], entry.move]),
    );
  }
})();
