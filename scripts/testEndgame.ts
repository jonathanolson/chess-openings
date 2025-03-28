import { Chess } from "chess.js";
import { Syzygy } from "../src/node/Syzygy.js";
import { getFen } from "../src/model/getFen.js";
import { Maia, sampleMaiaResult } from "../src/node/Maia.js";
import { Fen, Move } from "../src/model/common.js";
import { isFenWhiteToMove } from "../src/model/isFenWhiteToMove.js";
import { getSimplePGN } from "../src/model/getSimplePGN.js";

// npx tsx scripts/testEndgame.ts

(async () => {
  const syzygy = new Syzygy({ cache: 100000 });
  const maia = new Maia({ elo: 1500, cache: 100000 });

  const queenFen = "8/4k3/6Q1/8/8/8/3K4/8 w - - 0 1";

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

  for (let i = 0; i < 10000; i++) {
    const chess = new Chess(queenFen);

    const history: Move[] = [];

    while (!chess.isGameOver()) {
      let move: Move;

      const fen = getFen(chess);

      if (chess.turn() === "w") {
        move = await getMaiaMove(fen);
      } else {
        move = await getSyzygyMove(fen);
      }

      // console.log(move);
      history.push(move);
      chess.move(move);
    }

    console.log(i);
    console.log(getSimplePGN(history));

    if (chess.isCheckmate()) {
      console.log("Checkmate");
    } else if (chess.isStalemate()) {
      console.log("Stalemate");
    } else if (chess.isThreefoldRepetition()) {
      console.log("Draw by threefold repetition");
    } else if (chess.isDrawByFiftyMoves()) {
      console.log("Draw by 50 moves");
    } else if (chess.isInsufficientMaterial()) {
      console.log("Draw by insufficient material");
    } else {
      throw new Error("unknown");
    }
    console.log("");
  }

  await maia.dispose();
  await syzygy.dispose();
})();
