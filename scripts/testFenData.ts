import { computeCompactFenData } from "../src/node/computeCompactFenData.js";

// npx tsx scripts/testFenData.ts

(async () => {
  const fenData = computeCompactFenData();

  console.log(JSON.stringify(fenData));
})();
