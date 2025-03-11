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
import {
  browserEvaluate,
  disposeBrowser,
  getBrowser,
} from "./puppeteer-tools.js";
import { Fen } from "../src/model/common.js";

// npx tsx scripts/cacheStockfish.ts

const depth = 24;

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

  const browser = await getBrowser();

  const evaluateHooks = async (evaluate) => {
    return browserEvaluate(
      browser,
      // TODO: built version?
      "https://192.168.50.157:5173/hooks.html",
      evaluate,
    );
  };

  const getStockfishData = (): StockfishData => {
    return JSON.parse(fs.readFileSync("./src/data/stockfish.json", "utf8"));
  };

  const getNextFen = () => {
    const data = getStockfishData();
    return fens.find((fen) => !data[fen] || data[fen].d < depth);
  };

  while (true) {
    const fen = getNextFen();

    if (fen) {
      console.log(fen);

      const result = await evaluateHooks(
        `getEvaluation( ${JSON.stringify(fen)}, "depth ${depth}" )`,
      );

      console.log(result);

      const data = getStockfishData();
      data[fen] = {
        d: depth,
        s: result.evaluation,
      };
      if (result.type === "mate") {
        data[fen].m = "mate";
      }
      fs.writeFileSync("./src/data/stockfish.json", JSON.stringify(data));
    } else {
      break;
    }
  }

  await disposeBrowser(browser);
})();
