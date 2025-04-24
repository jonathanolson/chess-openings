import fenDataBase from "../data/fenDataBase.json";
import { CompactFenData } from "./common.js";

export let fenData: CompactFenData = fenDataBase as CompactFenData; // TODO: why cast?

export const loadFullFenData = async () => {
  const data = await import("../data/fenDataFull.json");
  debugger;
  fenData = data.default;
  // TODO: emit something?
};
