import { TinyEmitter } from "scenerystack/axon";
import fenDataBase from "../data/fenDataBase.json";
import { CompactFenData } from "./common.js";

export let fenData: CompactFenData = fenDataBase as CompactFenData; // TODO: why cast?
export let loadedFullFenData = false;
export const loadedFullFenDataEmitter = new TinyEmitter();

export const loadFullFenData = async () => {
  const data = await import("../data/fenDataFull.json");
  fenData = data.default as CompactFenData;
  loadedFullFenData = true;

  loadedFullFenDataEmitter.emit();
};
