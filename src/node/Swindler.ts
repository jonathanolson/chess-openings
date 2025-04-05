import { Maia } from "./Maia";
import { Syzygy } from "./Syzygy";
import { Gaviota } from "./Gaviota.js";
import { Fen, Move } from "../model/common.js";
import { ChessCache } from "../model/ChessCache.js";

const CACHE_SIZE = 10000000;
const MAIA_CUTOFF = 0.05;

export type SwindlerEval = {
  wdl: number;
  dtm: number;
};

export class Swindler {
  private readonly maia = new Maia({
    elo: 1500,
    cache: CACHE_SIZE,
  });

  private readonly syzygy = new Syzygy({
    cache: CACHE_SIZE,
  });

  private readonly gaviota = new Gaviota({
    cache: CACHE_SIZE,
  });

  private readonly chessCache = new ChessCache({
    cache: CACHE_SIZE,
  });

  public constructor() {}

  public async leafEvaluate(
    fen: Fen,
    isOurMove: boolean,
  ): Promise<SwindlerEval> {
    const chessData = this.chessCache.get(fen);

    if (chessData.isStalemate || chessData.isInsufficientMaterial) {
      return { wdl: 0, dtm: 0 };
    }

    if (chessData.isCheckmate) {
      return { wdl: isOurMove ? -1 : 1, dtm: 0 };
    }

    if (chessData.numPieces > 7) {
      throw new Error(
        `Perhaps figure out stockfish eval, pieces ${chessData.numPieces}`,
      );
    }

    const syzygyPromise = this.syzygy.evaluateFen(fen);
    const gaviotaPromise =
      chessData.numPieces <= 5 ? this.gaviota.evaluateFen(fen) : null;

    const syzygyResult = await syzygyPromise;
    const gaviotaResult = gaviotaPromise ? await gaviotaPromise : null;

    const wdl = Math.min(Math.max(syzygyResult.wdl, -1), 1);
    const dtm = gaviotaResult?.dtm ?? 0;

    return { wdl: isOurMove ? wdl : -wdl, dtm: isOurMove ? dtm : -dtm };
  }

  public async maiaEvaluate(fen: Fen, depth: number): Promise<SwindlerEval> {
    const chessData = this.chessCache.get(fen);

    if (chessData.isStalemate || chessData.isInsufficientMaterial) {
      return { wdl: 0, dtm: 0 };
    }

    if (chessData.isCheckmate) {
      return { wdl: 1, dtm: 0 };
    }

    const maiaResult = await this.maia.evaluateFen(fen);

    let totalProbability = 0;
    let wdl = 0;
    let totalDtmProbability = 0;
    let dtm = 0;

    const promises: Promise<void>[] = [];

    for (const move of Object.keys(maiaResult)) {
      const probability = maiaResult[move];

      if (probability > MAIA_CUTOFF) {
        totalProbability += probability;

        const moveFen = chessData.moveMap[move];
        if (!moveFen) {
          throw new Error("missing move");
        }

        const subPromise =
          depth > 0
            ? this.swinderEvaluate(moveFen, depth - 1)
            : this.leafEvaluate(moveFen, true);

        // TODO: see if we really are robust to stacking EVERYTHING together?
        if (depth > 0) {
          await subPromise;
        }

        const promise = subPromise.then((evalResult) => {
          wdl += evalResult.wdl * probability;

          if (evalResult.dtm !== 0) {
            totalDtmProbability += probability;
            dtm += evalResult.dtm * probability;
          }
        });

        promises.push(promise);
      }
    }

    await Promise.all(promises);

    wdl /= totalProbability;

    if (totalDtmProbability > 0) {
      dtm /= totalDtmProbability;
    }

    return { wdl, dtm };
  }

  public async swinderEvaluate(fen: Fen, depth: number): Promise<SwindlerEval> {
    // TODO: add pruning (and thus ordering of the moves)

    const chessData = this.chessCache.get(fen);

    if (chessData.isStalemate || chessData.isInsufficientMaterial) {
      return { wdl: 0, dtm: 0 };
    }

    if (chessData.isCheckmate) {
      return { wdl: -1, dtm: 0 };
    }

    // Figure out which moves maintain our WDL (bestMoves)

    const moveDirectEvalMap: Record<Move, SwindlerEval> = {};

    let bestWdl = -1;

    for (const move of chessData.moves) {
      const moveFen = chessData.moveMap[move];

      // TODO: parallelism
      const moveDirectEval = await this.leafEvaluate(moveFen, false);
      bestWdl = Math.max(bestWdl, moveDirectEval.wdl);
      moveDirectEvalMap[move] = moveDirectEval;
      // TODO: potential sort with dtm
    }

    const bestMoves = chessData.moves.filter(
      (move) => moveDirectEvalMap[move].wdl === bestWdl,
    );

    // let bestMove: Move | null = null;
    let bestEval: SwindlerEval = { wdl: -1, dtm: 0 };

    // TODO: tablebase lookup on these, since we can choose a guaranteed mate move if we have mate
    for (const move of bestMoves) {
      const moveFen = chessData.moveMap[move];

      const moveEval = await this.maiaEvaluate(moveFen, depth);

      if (isSwinderEvalBetter(bestEval, moveEval)) {
        bestEval = moveEval;
        // bestMove = move;
      }
    }

    return bestEval;
  }

  public async dispose(): Promise<void> {
    await this.maia.dispose();
    await this.syzygy.dispose();
    await this.gaviota.dispose();
  }
}

export const isSwinderEvalBetter = (
  worseEval: SwindlerEval,
  betterEval: SwindlerEval,
): boolean => {
  return (
    betterEval.wdl > worseEval.wdl ||
    (betterEval.wdl === worseEval.wdl &&
      (betterEval.wdl < 0
        ? betterEval.dtm > worseEval.dtm
        : betterEval.dtm < worseEval.dtm))
  );
};
