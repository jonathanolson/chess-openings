import { Chess } from "chess.js";
import { Fen, Move } from "../src/model/common.js";
import { isSwindlerEvalBetter, Swindler } from "../src/node/Swindler.js";
import { getFen } from "../src/model/getFen.js";

// npx tsx scripts/testSwindler.ts

(async () => {
  const swindler = new Swindler({
    useEvalCache: true,
  });

  console.log(
    await swindler.leafEvaluate("3k4/8/8/8/3K4/3P4/8/8 b - - 0 1", true),
  );
  console.log(
    await swindler.maiaEvaluate("3k4/8/8/8/3K4/3P4/8/8 w - - 0 1", 0),
  );
  console.log(
    await swindler.maiaEvaluate("4k3/8/3P4/3K4/8/8/8/8 w - - 0 1", 0),
  );

  // after Kf8
  console.log(
    await swindler.maiaEvaluate("5k2/8/3P4/4K3/8/8/8/8 w - - 0 1", 0),
  );
  // after Ke8
  console.log(
    await swindler.maiaEvaluate("4k3/8/3P4/4K3/8/8/8/8 w - - 0 1", 0),
  );

  const fenToSwindleMoves = async (fen: Fen, depth: number) => {
    const chess = new Chess(fen);
    const moves = chess.moves();

    type EvalWithMove = {
      move: Move;
      wdl: number;
      dtm: number;
    };

    const evalPromises: Promise<EvalWithMove>[] = moves.map(async (move) => {
      chess.move(move);
      const moveFen = getFen(chess);
      chess.undo();

      const evalResult = await swindler.maiaEvaluate(moveFen, depth);

      return {
        move,
        wdl: evalResult.wdl,
        dtm: evalResult.dtm,
      };
    });

    const evals: EvalWithMove[] = await Promise.all(evalPromises);

    evals.sort((a, b) => {
      if (isSwindlerEvalBetter(a, b)) {
        return 1;
      } else if (isSwindlerEvalBetter(b, a)) {
        return -1;
      } else {
        return 0;
      }
    });

    return evals;
  };

  // const fen0 = "8/8/4k3/6K1/8/6P1/8/8 b - - 0 1";
  // const fen1 = "8/5k2/7K/8/8/6P1/8/8 b - - 0 1"; // after ...Kf7, Kh6
  // const fen2 = "8/8/5k1K/8/6P1/8/8/8 b - - 0 1"; // after ...Kf6, g4
  // const fen3 = "8/5k2/7K/6P1/8/8/8/8 b - - 0 1"; // after ...Kf7, g5
  // const fen4 = "6k1/8/6K1/6P1/8/8/8/8 b - - 0 1"; // after ...Kg8, Kg6
  // const fen5 = "7k/5K2/8/6P1/8/8/8/8 b - - 0 1"; // after ...Kh8, Kf7
  //
  // const fens = [fen0, fen1, fen2, fen3, fen4, fen5];

  const fullStart = Date.now();

  // for (const fen of fens) {
  //   console.log(fen);
  //
  //   for (let i = 0; i < 6; i++) {
  //     let time = Date.now();
  //     console.log(await fenToSwindleMoves(fen, i));
  //
  //     console.log(Date.now() - time);
  //   }
  // }

  const fens: Fen[] = ["3k4/8/8/8/3K4/3P4/8/8 b - - 0 1"];
  const completedFens = new Set<Fen>();

  let i = 0;
  while (fens.length) {
    const fen = fens.shift();
    completedFens.add(fen);

    console.log(fen);

    i++;

    let time = Date.now();
    const swindleMoves = await fenToSwindleMoves(fen, 5);
    console.log(swindleMoves);

    console.log(i, Date.now() - time);

    // 30% threshold from best
    const chosenMoves = swindleMoves.filter(
      (swindleMove) => swindleMove.wdl > swindleMoves[0].wdl - 0.3,
    );

    const chess = new Chess(fen);
    for (const chosenMove of chosenMoves) {
      chess.move(chosenMove.move);

      if (
        !chess.isCheck() &&
        !chess.isStalemate() &&
        !chess.isInsufficientMaterial()
      ) {
        const moves = chess.moves();

        for (const move of moves) {
          chess.move(move);

          if (
            !chess.isCheck() &&
            !chess.isStalemate() &&
            !chess.isInsufficientMaterial()
          ) {
            const fen = getFen(chess);
            if (!completedFens.has(fen)) {
              // TODO: don't hack private
              const syzygyResult = await swindler.syzygy.evaluateFen(fen);

              // NOTE: we are... only filtering for wins here from the non-swindler, right?
              // if (syzygyResult.wdl === -1) {
              fens.push(fen);
              // console.log("adding", chosenMove.move, move);
              // }
            }
          }

          chess.undo();
        }
      }

      chess.undo();
    }
  }

  console.log("Total time:", Date.now() - fullStart);

  await swindler.dispose();
})();
