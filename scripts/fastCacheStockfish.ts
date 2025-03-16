import chessOpenings from "../src/data/chessOpenings.js";
import { ChessNode, Nodes } from "../src/model/ChessNode.js";
import { compactStateToNodes } from "../src/model/compactStateToNodes.js";
import { scanConflicts } from "../src/model/scanConflicts.js";
// @ts-expect-error Some options
import _ from "lodash";
// @ts-expect-error Some options
import fs from "fs";
// @ts-expect-error Some options
import os from "os";
import { Fen, Move } from "../src/model/common.js";
// @ts-expect-error Some options
import child_process from "child_process";
import { Chess } from "chess.js";
import { getFen } from "../src/model/getFen.js";
import type {
  StockfishData,
  StockfishEntry,
} from "../src/model/StockfishData.js";
import type { CompactLichessExplore } from "../src/model/getLichessExplore.js";
import { initialFen } from "../src/model/initialFen.js";

// npx tsx scripts/cacheStockfish.ts

const depth = 36;

const orderMethod = process.argv[2];

if (
  orderMethod !== "depth" &&
  orderMethod !== "popularity" &&
  orderMethod !== "biased" &&
  orderMethod !== "biasedLeaf"
) {
  throw new Error(`Invalid order method: ${orderMethod}`);
}

const boostLines: Move[][] = [
  ["d4", "d5", "Bf4", "c5"],
  ["d4", "d5", "Bf4", "c5", "e3", "Nc6"],
];

os.setPriority(os.constants.priority.PRIORITY_LOW);

(async () => {
  const whiteNodes: Nodes = {};
  const blackNodes: Nodes = {};

  compactStateToNodes(whiteNodes, chessOpenings.white, true);
  compactStateToNodes(blackNodes, chessOpenings.black, false);

  scanConflicts(whiteNodes, true);
  scanConflicts(blackNodes, false);

  // Find all of the potential "next" moves
  const fenExtend = (fens: Fen[]): Fen[] =>
    fens.flatMap((fen) => {
      const rootBoard = new Chess(fen);
      return rootBoard.moves().map((move) => {
        const board = new Chess(fen);
        board.move(move);

        return getFen(board);
      });
    });

  let fens: Fen[];

  type PopularityEntry = {
    fen: Fen;
    popularity: number;
  };

  const mainExplore: CompactLichessExplore = JSON.parse(
    fs.readFileSync("./src/data/lichessExploreBlitzLowDeep.json", "utf8"),
  );

  if (orderMethod === "depth") {
    const whiteFens = Object.keys(whiteNodes);
    const blackFens = Object.keys(blackNodes);
    const whiteExtendedFens = fenExtend(whiteFens);
    const blackExtendedFens = fenExtend(blackFens);
    console.log(`whiteFens: ${whiteFens.length}`);
    console.log(`blackFens: ${blackFens.length}`);
    console.log(`whiteExtendedFens: ${whiteExtendedFens.length}`);
    console.log(`blackExtendedFens: ${blackExtendedFens.length}`);

    fens = _.uniq([
      ...whiteFens,
      ...blackFens,
      ...whiteExtendedFens,
      ...blackExtendedFens,
      // ...fenExtend(whiteExtendedFens),
      // ...fenExtend(blackExtendedFens),
    ]);
  } else if (orderMethod === "popularity") {
    console.log("computing popularity map");

    const popularityMap: Record<Fen, number> = {};
    const recur = (explore: CompactLichessExplore, fen: Fen) => {
      const popularity = explore.d[0] + explore.d[1] + explore.d[2];

      if (popularityMap[fen]) {
        popularityMap[fen] += popularity;
      } else {
        popularityMap[fen] = popularity;
      }

      if (explore.m) {
        for (const move of Object.keys(explore.m)) {
          const board = new Chess(fen);
          board.move(move);
          const subFen = getFen(board);

          recur(explore.m[move], subFen);
        }
      }
    };
    recur(mainExplore, initialFen);

    console.log("ordering by popularity");

    const popularityEntries: PopularityEntry[] = Object.keys(popularityMap).map(
      (fen) => ({
        fen,
        popularity: popularityMap[fen],
      }),
    );

    fens = _.sortBy(popularityEntries, [(entry) => -entry.popularity]).map(
      (entry) => entry.fen,
    );
  } else if (orderMethod === "biased" || orderMethod === "biasedLeaf") {
    const leafOnly = orderMethod === "biasedLeaf";

    const skipZeroProbability = true;

    console.log("computing popularity map");

    const popularityMap: Record<
      Fen,
      { popularity: number; histories: Move[][] }
    > = {};

    const getExploreMoveCount = (explore: CompactLichessExplore, move: Move) =>
      explore.m && explore.m[move]
        ? explore.m[move].d[0] + explore.m[move].d[1] + explore.m[move].d[2]
        : 0;

    const runNodes = (nodes: Nodes, isWhite: boolean) => {
      const breadthFirstChessNodes: ChessNode[] = [];
      const historyMap = new Map<ChessNode, Move[]>();

      {
        const rootNode = nodes[initialFen];
        const visited = new Set<ChessNode>();
        const queue: Array<[ChessNode, Move[]]> = [];

        queue.push([rootNode, []]);
        visited.add(rootNode);

        while (queue.length > 0) {
          const [currentNode, currentHistory] = queue.shift()!;

          breadthFirstChessNodes.push(currentNode);
          historyMap.set(currentNode, currentHistory);

          // console.log(isWhite ? "white" : "black", currentHistory.join(" "));

          for (const move of currentNode.moves) {
            const nextNode = currentNode.moveMap[move];
            if (!visited.has(nextNode)) {
              visited.add(nextNode);
              queue.push([nextNode, [...currentHistory, move]]);
            }
          }
        }
      }

      for (const chessNode of breadthFirstChessNodes) {
        // Skip non-leaves if we are only looking at leaves
        if (leafOnly && chessNode.children.length > 0) {
          continue;
        }

        let baseProbability = 0;
        let explores: CompactLichessExplore[] = [];

        const histories = chessNode.getHistories();

        for (const history of histories) {
          let explore: CompactLichessExplore | null = mainExplore;
          let board = new Chess();
          let probability = 1;

          for (let i = 0; i < history.length; i++) {
            const move = history[i];

            let possibleMoveCount = board.moves().length;
            let moveProbability =
              possibleMoveCount > 0 ? 1 / possibleMoveCount : 0;
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

        const boostCount = boostLines.filter((line) => {
          return histories.some((history) => {
            return (
              history.length >= line.length &&
              line.every((move, i) => history[i] === move)
            );
          });
        }).length;

        baseProbability *= Math.pow(25, boostCount);
        if (boostCount > 0) {
          baseProbability += 0.001;
        }

        console.log(isWhite ? "white" : "black", histories[0], baseProbability);

        const addPopularity = (fen: Fen, popularity: number) => {
          if (popularity === 0 && skipZeroProbability) {
            return;
          }

          if (popularityMap[fen]) {
            popularityMap[fen].popularity += popularity;
          } else {
            popularityMap[fen] = {
              popularity,
              histories: histories,
            };
          }
        };

        addPopularity(chessNode.fen, baseProbability);

        if (baseProbability === 0 && skipZeroProbability) {
          continue;
        }

        let totalNextCount = 0;
        for (const explore of explores) {
          if (explore.m) {
            for (const move of Object.keys(explore.m)) {
              totalNextCount += getExploreMoveCount(explore, move);
            }
          }
        }

        const nextMoves = new Chess(chessNode.fen).moves();
        for (const move of nextMoves) {
          const nextBoard = new Chess(chessNode.fen);
          nextBoard.move(move);
          const nextFen = getFen(nextBoard);

          // If it will be included directly, exclude this!
          if (nodes[nextFen]) {
            continue;
          }

          let partialNextProbability = 1 / nextMoves.length;

          let nextExplores: CompactLichessExplore[] = [];

          if (totalNextCount > 0) {
            let moveCount = 0;
            for (const explore of explores) {
              if (explore && explore.m) {
                moveCount += getExploreMoveCount(explore, move);
                nextExplores.push(explore);
              }
            }
            partialNextProbability = moveCount / totalNextCount;
          }

          if (boostCount > 0) {
            partialNextProbability += 0.001;
          }

          let nextProbability = baseProbability * partialNextProbability;

          // console.log(`  ${move}`, nextProbability);

          addPopularity(nextFen, nextProbability);

          if (nextProbability === 0 && skipZeroProbability) {
            continue;
          }

          // If it is our move next, then we will evaluate our moves another level
          if (isWhite === (nextBoard.turn() === "w")) {
            let totalNextNextCount = 0;
            for (const nextExplore of nextExplores) {
              if (nextExplore.m) {
                for (const nextMove of Object.keys(nextExplore.m)) {
                  totalNextNextCount += getExploreMoveCount(
                    nextExplore,
                    nextMove,
                  );
                }
              }
            }

            const nextNextMoves = nextBoard.moves();
            for (const nextMove of nextNextMoves) {
              const nextNextBoard = new Chess(nextFen);
              nextNextBoard.move(nextMove);
              const nextNextFen = getFen(nextNextBoard);

              // If it will be included directly, exclude this!
              if (nodes[nextNextFen]) {
                continue;
              }

              let partialNextNextProbability = 1 / nextNextMoves.length;

              if (totalNextNextCount > 0) {
                let moveCount = 0;
                for (const explore of nextExplores) {
                  if (explore && explore.m) {
                    moveCount += getExploreMoveCount(explore, nextMove);
                  }
                }
                partialNextNextProbability = moveCount / totalNextNextCount;
              }

              if (boostCount > 0) {
                partialNextNextProbability += 0.001;
              }

              const nextNextProbability =
                nextProbability * partialNextNextProbability;

              // console.log(`    ${nextMove}`, nextNextProbability);

              addPopularity(nextNextFen, nextNextProbability);
            }
          }
        }
      }
    };
    runNodes(whiteNodes, true);
    runNodes(blackNodes, false);

    const popularityEntries: PopularityEntry[] = Object.keys(popularityMap).map(
      (fen) => ({
        fen,
        popularity: popularityMap[fen].popularity,
      }),
    );

    const orderedPopularityEntries = _.sortBy(popularityEntries, [
      (entry) => -entry.popularity,
    ]);

    // console.log(orderedPopularityEntries.slice(10));
    //
    // throw new Error("STILL TESTING");

    fens = orderedPopularityEntries.map((entry) => entry.fen);
  } else {
    throw new Error(`Missing order method implementation: ${orderMethod}`);
  }

  console.log(`total: ${fens.length}`);

  const getStockfishData = (): StockfishData => {
    return JSON.parse(fs.readFileSync("./src/data/stockfish.json", "utf8"));
  };

  const getNextFen = () => {
    const data = getStockfishData();

    // NOTE: depth returned for checkmates can be zero (!) Could re-enable this in the future maybe.
    return fens.find((fen) => !data[fen]);
    // return fens.find((fen) => !data[fen] || data[fen].d < depth);
  };

  const process = child_process.spawn("./.stockfish", [], {
    cwd: ".",
  });

  process.on("error", (error) => {
    throw error;
  });
  process.stdout.on("data", (data) => {
    // console.log(data.toString());
  });

  const sendCommand = (cmd: string) => process.stdin.write(cmd + "\n");

  sendCommand("uci");
  sendCommand("ucinewgame");
  sendCommand("setoption name Hash value 2048");
  sendCommand("setoption name Threads value 8");

  const evaluateFen = (fen: string): Promise<StockfishEntry> => {
    return new Promise((resolve, reject) => {
      sendCommand(`position fen ${fen}`);
      sendCommand(`go depth ${depth}`);

      let entry: StockfishEntry | null = null;
      let entryLine: string | null = null;

      const handler = (data: Buffer) => {
        const output = data.toString();

        const lines = output
          .split("\n")
          .map((s) => s.trim())
          .filter((s) => s.length > 0);

        for (const line of lines) {
          // Extract the last depth and score from "info depth" lines
          const infoMatch = line.match(
            /info depth (\d+) .*? ?score (cp|mate) (-?\d+)/,
          );
          if (infoMatch) {
            const depth = parseInt(infoMatch[1], 10);
            const type = infoMatch[2];
            const value = parseInt(infoMatch[3], 10);

            const result: StockfishEntry = {
              d: depth,
              s: value,
            };
            if (type === "mate") {
              result.m = "mate";
            }

            const move = line.match(/ pv ([^ \n]+)/)?.[1] ?? null;

            console.log(move, result);

            entry = result;
            entryLine = line;
          }

          const bestmoveMatch = line.match(/bestmove ([^ \n]+)/);
          if (bestmoveMatch) {
            const move = bestmoveMatch[1];

            if (move !== "(none)" && !entryLine.includes(` pv ${move}`)) {
              throw new Error(
                `Best move ${move} not found in entry line ${entryLine}`,
              );
            }

            process.stdout.off("data", handler); // Remove listener after first response
            resolve(entry);
          }
        }
      };

      process.stdout.on("data", handler);
    });
  };

  while (true) {
    const fen = getNextFen();

    if (fen) {
      console.log(fen);
      console.log(fens.indexOf(fen));

      const entry = await evaluateFen(fen);

      const data = getStockfishData();
      data[fen] = entry;

      fs.writeFileSync("./src/data/stockfish.json", JSON.stringify(data));
    } else {
      break;
    }
  }
})();
