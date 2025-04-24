import { TinyEmitter } from "scenerystack/axon";
import fenDataBase from "../data/fenDataBase.json";
import { CompactFenData, Fen } from "./common.js";
import { StockfishData } from "./StockfishData.js";
import { Chess } from "chess.js";
import { initialFen } from "./initialFen.js";
import { getFen } from "./getFen.js";

export let fenData: CompactFenData = fenDataBase as CompactFenData; // TODO: why cast?
export const fenDataStockfishData: StockfishData = {};

export let loadedFullFenData = false;
export const loadedFullFenDataEmitter = new TinyEmitter();

const loadStockfishData = (baseData: CompactFenData): void => {
  const chess = new Chess(initialFen);

  // index => Fen
  // TODO: could replace with boolean?
  const fenIndexMap: (Fen | null)[] = baseData.map(() => null);

  // compute fenIndexMap
  const recur = (index: number): void => {
    if (fenIndexMap[index] === null) {
      const fen = getFen(chess);
      fenIndexMap[index] = fen;

      const entry = baseData[index];

      if (entry.s !== undefined) {
        fenDataStockfishData[fen] = {
          d: 36, // TODO: don't hardcode
          s: entry.s,
        };
        if (entry.sm) {
          fenDataStockfishData[fen].m = entry.sm;
        }

        // only here do children (so we don't chase transpositions AND we don't go into un-eval'ed trees)
        if (entry.m) {
          for (const move of Object.keys(entry.m)) {
            const i = entry.m[move].i;

            // don't progress down if our child doesn't have a score/eval
            if (i !== undefined && baseData[i].s !== undefined) {
              chess.move(move);
              recur(i);
              chess.undo();
            }
          }
        }
      }
    }
  };
  recur(0);
};
loadStockfishData(fenData);

export const loadFullFenData = async () => {
  const data = await import("../data/fenDataFull.json");
  fenData = data.default as CompactFenData;
  loadedFullFenData = true;
  loadStockfishData(fenData);

  loadedFullFenDataEmitter.emit();
};
