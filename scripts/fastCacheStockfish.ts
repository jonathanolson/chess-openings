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

if (orderMethod !== "depth" && orderMethod !== "popularity") {
  throw new Error(`Invalid order method: ${orderMethod}`);
}

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
      ...fenExtend(whiteExtendedFens),
      ...fenExtend(blackExtendedFens),
    ]);
  } else if (orderMethod === "popularity") {
    const mainExplore: CompactLichessExplore = JSON.parse(
      fs.readFileSync("./src/data/lichessExploreBlitzLowDeep.json", "utf8"),
    );

    type PopularityEntry = {
      fen: Fen;
      popularity: number;
    };

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
