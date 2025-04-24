import {
  CompactFenData,
  CompactFenEntry,
  CompactFenMoveEntry,
  Move,
} from "./common.js";

export const filterCompactFenData = (
  inputFenData: CompactFenData,
  filter: (history: Move[], hasEngine: boolean, hasMoves: boolean) => boolean,
): CompactFenData => {
  const indexMapping: (number | null)[] = inputFenData.map(() => null);
  const inputIndices: number[] = [];

  let nextIndex = 0;
  const recur = (history: Move[], inputIndex: number) => {
    // Ignore if we've already traversed this
    if (indexMapping[inputIndex] !== null) {
      return;
    }

    const inputEntry: CompactFenEntry = inputFenData[inputIndex];
    const hasEngine = inputEntry.s !== undefined;
    const hasMoves = inputEntry.m !== undefined;

    if (filter(history, hasEngine, hasMoves)) {
      const outputIndex = nextIndex++;
      indexMapping[inputIndex] = outputIndex;
      inputIndices.push(inputIndex);

      if (inputEntry.m) {
        for (const move of Object.keys(inputEntry.m)) {
          const nextIndex = inputEntry.m[move].i;

          if (nextIndex !== undefined) {
            recur([...history, move], nextIndex);
          }
        }
      }
    }
  };

  recur([], 0);

  return inputIndices.map((inputIndex) => {
    const inputEntry = inputFenData[inputIndex];
    const outputEntry: CompactFenEntry = {};

    if (inputEntry.s !== undefined) {
      outputEntry.s = inputEntry.s;
    }
    if (inputEntry.sm !== undefined) {
      outputEntry.sm = inputEntry.sm;
    }
    if (inputEntry.m) {
      outputEntry.m = {};

      for (const move of Object.keys(inputEntry.m)) {
        const inputMoveObject = inputEntry.m[move];
        const outputMoveObject: CompactFenMoveEntry = {};

        outputEntry.m[move] = outputMoveObject;

        for (const shorthand of ["bl", "bh", "ma", "rl", "rh"] as const) {
          if (inputMoveObject[shorthand]) {
            outputMoveObject[shorthand] = inputMoveObject[shorthand];
          }
        }

        if (inputMoveObject.i !== undefined) {
          const oldIndex = inputMoveObject.i;
          const newIndex = indexMapping[oldIndex];

          if (newIndex !== null) {
            outputMoveObject.i = newIndex;
          }
        }
      }
    }

    return outputEntry;
  });
};
