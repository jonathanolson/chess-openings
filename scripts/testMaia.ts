import { Maia } from "../src/node/Maia.js";

// npx tsx scripts/testMaia.ts

(async () => {
  const maia = new Maia({ elo: 1900, cache: 10000 });

  let time = Date.now();

  console.log(await maia.evaluateFen("5k2/8/3P4/4K3/8/8/8/8 w - - 0 1"));

  console.log(Date.now() - time);
  time = Date.now();

  console.log(await maia.evaluateFen("5k2/8/3P4/4K3/8/8/8/8 w - - 0 1"));

  console.log(Date.now() - time);
  time = Date.now();

  console.log(
    await maia.evaluateFen(
      "rnbqk1nr/ppp2ppp/4p3/8/1b1PN3/8/PPPB1PPP/R2QKBNR b KQkq - 0 1",
    ),
  );

  console.log(Date.now() - time);
  time = Date.now();

  console.log(
    await maia.evaluateFen(
      "rnbqk1nr/ppp2ppp/4p3/8/1b1PN3/8/PPPB1PPP/R2QKBNR b KQkq - 0 1",
    ),
  );

  console.log(Date.now() - time);
  time = Date.now();

  await maia.dispose();
})();
