import { Chess } from "chess.js";
import { Gaviota } from "../src/node/Gaviota.js";
import { getFen } from "../src/model/getFen.js";

// npx tsx scripts/testGaviota.ts

(async () => {
  const syzygy = new Gaviota({ cache: 10000 });

  const baseFen = "5k2/8/3P4/4K3/8/8/8/8 w - - 0 1";

  console.log(await syzygy.evaluateFen(baseFen));

  const moves = new Chess(baseFen).moves();

  for (const move of moves) {
    const chess = new Chess(baseFen);
    chess.move(move);
    const fen = getFen(chess);
    console.log(move, await syzygy.evaluateFen(fen));
  }

  await syzygy.dispose();
})();
