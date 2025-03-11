// @ts-expect-error Because worker
import StockfishWorker from "stockfish/src/stockfish-nnue-16-single.js?worker";

let hintWorker: Worker | null = null;

export const getStockfishWorker = (): Worker => {
  if (!hintWorker) {
    hintWorker = new StockfishWorker();
  }

  return hintWorker!;
};

// Load on startup (for now)
getStockfishWorker();
