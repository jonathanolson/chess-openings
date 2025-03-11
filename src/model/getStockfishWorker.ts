// @ts-expect-error Because worker
import StockfishWorker from "stockfish/src/stockfish-nnue-16-single.js?worker";

import { TinyProperty } from "scenerystack/axon";

let hintWorker: Worker | null = null;

export const hintWorkerLoadedProperty = new TinyProperty(false);

export const getStockfishWorker = (): Worker => {
  if (!hintWorker) {
    hintWorker = new StockfishWorker();

    hintWorker?.addEventListener("message", (event) => {
      if (
        typeof event.data === "string" &&
        event.data.includes("Stockfish 16")
      ) {
        hintWorkerLoadedProperty.value = true;
      }
    });
  }

  return hintWorker!;
};

// Load on startup (for now)
getStockfishWorker();
