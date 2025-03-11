import chessOpenings from "../src/data/chessOpenings.js";
import { Nodes } from "../src/model/ChessNode.js";
import { compactStateToNodes } from "../src/model/compactStateToNodes.js";
import { scanConflicts } from "../src/model/scanConflicts.js";
// @ts-expect-error Some options
import _ from "lodash";
// @ts-expect-error Some options
import fs from "fs";
// @ts-expect-error Some options
import os from "os";
import { Fen } from "../src/model/common.js";
// @ts-expect-error Some options
import child_process from "child_process";

// npx tsx scripts/cacheStockfish.ts

const depth = 36;

os.setPriority(os.constants.priority.PRIORITY_LOW);

type StockfishEntry = {
  d: number; // depth
  s: number; // score
  m?: "mate"; // if mate
};
type StockfishData = Record<Fen, StockfishEntry>;

(async () => {
  const whiteNodes: Nodes = {};
  const blackNodes: Nodes = {};

  compactStateToNodes(whiteNodes, chessOpenings.white, true);
  compactStateToNodes(blackNodes, chessOpenings.black, false);

  scanConflicts(whiteNodes, true);
  scanConflicts(blackNodes, false);

  // shuffle helps for parallelization (fewer conflicts)
  const fens = _.shuffle(
    _.uniq([...Object.keys(whiteNodes), ...Object.keys(blackNodes)]),
  );

  const getStockfishData = (): StockfishData => {
    return JSON.parse(fs.readFileSync("./src/data/stockfish.json", "utf8"));
  };

  const getNextFen = () => {
    const data = getStockfishData();
    return fens.find((fen) => !data[fen] || data[fen].d < depth);
  };

  const process = child_process.spawn("./.stockfish", [], {
    cwd: ".",
  });

  process.on("error", (error) => {
    throw error;
  });
  process.stdout.on("data", (data) => {
    console.log("data");
    console.log(data.toString());
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

        // Extract the last depth and score from "info depth" lines
        const infoMatch = output.match(
          /info depth (\d+) .*? score (cp|mate) (-?\d+)/,
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

          entry = result;
          entryLine = output;
        }

        const bestmoveMatch = output.match(/bestmove ([^ ]+)/);
        if (bestmoveMatch) {
          const move = bestmoveMatch[1];

          if (!entryLine.includes(` pv ${move}`)) {
            throw new Error(
              `Best move ${move} not found in entry line ${entryLine}`,
            );
          }

          process.stdout.off("data", handler); // Remove listener after first response
          resolve(entry);
        }
      };

      process.stdout.on("data", handler);
    });
  };

  while (true) {
    const fen = getNextFen();

    if (fen) {
      console.log(fen);

      const entry = await evaluateFen(fen);

      const data = getStockfishData();
      data[fen] = entry;

      fs.writeFileSync("./src/data/stockfish.json", JSON.stringify(data));
    } else {
      break;
    }
  }
})();
