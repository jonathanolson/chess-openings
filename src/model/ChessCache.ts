import { LRUCache } from "lru-cache";
import { Fen } from "./common.js";
import { ChessData } from "./ChessData.js";

export type ChessCacheOptions = {
  cache: number | LRUCache<Fen, ChessData>;
};

export class ChessCache {
  private readonly cache: LRUCache<Fen, ChessData>;

  public constructor(options: ChessCacheOptions) {
    if (typeof options.cache === "number") {
      this.cache = new LRUCache({ max: options.cache });
    } else {
      this.cache = options.cache;
    }
  }

  public get(fen: Fen): ChessData {
    const cachedResult = this.cache.get(fen);
    if (cachedResult) {
      return cachedResult;
    } else {
      const chessData = new ChessData(fen);

      this.cache.set(fen, chessData);

      return chessData;
    }
  }
}
