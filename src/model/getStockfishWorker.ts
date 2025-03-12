// @ts-expect-error Because worker
import StockfishWorker from "stockfish/src/stockfish-nnue-16-single.js?worker";

// COOP/COEP notes (for multi-threaded stockfish):
// https://github.com/orgs/community/discussions/13309
// https://github.com/GoogleChrome/workbox/issues/2963
// https://www.captaincodeman.com/cross-origin-isolation-with-sveltekit-vite-and-firebase

let hintWorker: Worker | null = null;

export const getStockfishWorker = (): Worker => {
  if (!hintWorker) {
    hintWorker = new StockfishWorker();
  }

  return hintWorker!;
};

// Load on startup (for now)
getStockfishWorker();
