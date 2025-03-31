import { Chess } from "chess.js";
import { Syzygy } from "../src/node/Syzygy.js";
import { getFen } from "../src/model/getFen.js";
import { Maia, sampleMaiaResult } from "../src/node/Maia.js";
import { Fen, Move } from "../src/model/common.js";
import { isFenWhiteToMove } from "../src/model/isFenWhiteToMove.js";
import { getSimplePGN } from "../src/model/getSimplePGN.js";

// npx tsx scripts/testEndgame2.ts

(async () => {
  const syzygy = new Syzygy({ cache: 1000000 });
  const maia = new Maia({ elo: 1500, cache: 1000000 });

  const queenFen = "8/4k3/6Q1/8/8/8/3K4/8 w - - 0 1";

  type FenInfo = {
    fen: Fen;
    moveMap: Record<Move, Fen>;
    isCheckmate: boolean;
    isDraw: boolean;
  };

  const fenInfoMap: Record<Fen, FenInfo> = {};
  const pendingFenSet = new Set<Fen>();

  pendingFenSet.add(queenFen);

  let i = 0;

  while (pendingFenSet.size) {
    const fen = pendingFenSet.values().next().value;
    pendingFenSet.delete(fen);

    const chess = new Chess(fen);
    const moveMap: Record<Move, Fen> = {};
    const isCheckmate = chess.isCheckmate();
    const isDraw = chess.isStalemate() || chess.isInsufficientMaterial();

    if (!isCheckmate && !isDraw) {
      const moves = chess.moves();

      for (const move of moves) {
        chess.move(move);
        const newFen = getFen(chess);
        chess.undo();

        moveMap[move] = newFen;

        if (!fenInfoMap[newFen]) {
          pendingFenSet.add(newFen);
        }
      }
    }

    fenInfoMap[fen] = { fen, moveMap, isCheckmate, isDraw };

    console.log(++i, pendingFenSet.size);
  }

  const getMaiaMove = async (fen: Fen): Promise<Move> => {
    const maiaResult = await maia.evaluateFen(fen);
    return sampleMaiaResult(maiaResult);
  };

  const getSyzygyMove = async (fen: Fen): Promise<Move> => {
    const moves = new Chess(fen).moves();

    type MoveResult = {
      move: Move;
      wdl: number;
      dtz: number;
    };

    const moveResults: MoveResult[] = [];

    const promises: Promise<void>[] = [];

    for (const move of moves) {
      const chess = new Chess(fen);
      chess.move(move);
      const newFen = getFen(chess);
      promises.push(
        (async () => {
          const { wdl, dtz } = await syzygy.evaluateFen(newFen);
          moveResults.push({ move, wdl, dtz });
        })(),
      );
    }

    const isWhite = isFenWhiteToMove(fen);

    await Promise.all(promises);

    moveResults.sort((a, b) => {
      const wdlDiff = a.wdl - b.wdl;
      if (wdlDiff !== 0) {
        // We want the reverse of the normal order, since AFTER the move, it will be the opposite player's turn
        return isWhite ? wdlDiff : -wdlDiff;
      }

      // Then sort by smallest DTZ
      return Math.abs(a.dtz) - Math.abs(b.dtz);
    });

    // console.log(moveResults);

    return moveResults[0].move;
  };

  // let resultNumber = 0;
  // let winCount = 0;
  // let drawCount = 0;
  //
  // let maiaTime = 0;
  // let syzygyTime = 0;
  //
  // const NUM_THREADS = 4; // yes they are not actually threads I get it
  //
  // // launch threads
  // const threadPromises: Promise<void>[] = [];
  // for (let i = 0; i < NUM_THREADS; i++) {
  //   // TODO: where is our time coming from?
  //   threadPromises.push(
  //     (async () => {
  //       while (true) {
  //         const chess = new Chess(queenFen);
  //
  //         const history: Move[] = [];
  //
  //         while (!chess.isGameOver()) {
  //           let move: Move;
  //
  //           const fen = getFen(chess);
  //
  //           const start = Date.now();
  //
  //           if (chess.turn() === "w") {
  //             move = await getMaiaMove(fen);
  //           } else {
  //             move = await getSyzygyMove(fen);
  //           }
  //
  //           const time = Date.now() - start;
  //           if (chess.turn() === "w") {
  //             maiaTime += time;
  //           } else {
  //             syzygyTime += time;
  //           }
  //
  //           // console.log(move);
  //           history.push(move);
  //           chess.move(move);
  //         }
  //
  //         if (chess.isCheckmate()) {
  //           winCount++;
  //         } else {
  //           drawCount++;
  //         }
  //
  //         if (
  //           resultNumber < 100 ||
  //           (resultNumber < 1000 && resultNumber % 10 === 0) ||
  //           (resultNumber < 10000 && resultNumber % 100 === 0) ||
  //           resultNumber % 1000 === 0
  //         ) {
  //           console.log(
  //             resultNumber,
  //             winCount / (winCount + drawCount),
  //             maiaTime / (maiaTime + syzygyTime),
  //             maia.cache.size,
  //             syzygy.cache.size,
  //           );
  //           // console.log(getSimplePGN(history));
  //
  //           // if (chess.isCheckmate()) {
  //           //   console.log("Checkmate");
  //           // } else if (chess.isStalemate()) {
  //           //   console.log("Stalemate");
  //           // } else if (chess.isThreefoldRepetition()) {
  //           //   console.log("Draw by threefold repetition");
  //           // } else if (chess.isDrawByFiftyMoves()) {
  //           //   console.log("Draw by 50 moves");
  //           // } else if (chess.isInsufficientMaterial()) {
  //           //   console.log("Draw by insufficient material");
  //           // } else {
  //           //   throw new Error("unknown");
  //           // }
  //           // console.log("");
  //         }
  //
  //         resultNumber++;
  //       }
  //     })(),
  //   );
  // }
  //
  // await Promise.all(threadPromises);

  await maia.dispose();
  await syzygy.dispose();
})();
