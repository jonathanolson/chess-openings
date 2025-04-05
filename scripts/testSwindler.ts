import { Chess } from "chess.js";
import { Fen, Move } from "../src/model/common.js";
import { isSwinderEvalBetter, Swindler } from "../src/node/Swindler.js";
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

    const evals: EvalWithMove[] = [];

    for (const move of moves) {
      chess.move(move);
      const moveFen = getFen(chess);
      chess.undo();

      const evalResult = await swindler.maiaEvaluate(moveFen, depth);

      evals.push({
        move,
        wdl: evalResult.wdl,
        dtm: evalResult.dtm,
      });
    }

    evals.sort((a, b) => {
      if (isSwinderEvalBetter(a, b)) {
        return 1;
      } else if (isSwinderEvalBetter(b, a)) {
        return -1;
      } else {
        return 0;
      }
    });

    return evals;
  };

  const fen0 = "8/8/4k3/6K1/8/6P1/8/8 b - - 0 1";
  const fen1 = "8/5k2/7K/8/8/6P1/8/8 b - - 0 1"; // after ...Kf7, Kh6
  const fen2 = "8/8/5k1K/8/6P1/8/8/8 b - - 0 1"; // after ...Kf6, g4
  const fen3 = "8/5k2/7K/6P1/8/8/8/8 b - - 0 1"; // after ...Kf7, g5
  const fen4 = "6k1/8/6K1/6P1/8/8/8/8 b - - 0 1"; // after ...Kg8, Kg6
  const fen5 = "7k/5K2/8/6P1/8/8/8/8 b - - 0 1"; // after ...Kh8, Kf7

  const fens = [fen0, fen1, fen2, fen3, fen4, fen5];

  const fullStart = Date.now();

  for (const fen of fens) {
    console.log(fen);

    for (let i = 0; i < 6; i++) {
      let time = Date.now();
      console.log(await fenToSwindleMoves(fen, i));

      console.log(Date.now() - time);
    }
  }

  console.log("Total time:", Date.now() - fullStart);

  await swindler.dispose();
})();
