import { Stockfish, StockfishResult } from "./model/Stockfish.js";

const stockfish = new Stockfish({
  hashSizeInMegabytes: 128,
});

// @ts-expect-error global defined
window.getEvaluation = async (
  fen: string,
  timeString: string,
): Promise<StockfishResult> => {
  return stockfish.getEvaluation(fen, timeString);
};
