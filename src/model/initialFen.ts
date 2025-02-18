import { Fen } from "./common.js";
import { getFen } from "./getFen.js";
import { Chess } from "chess.js";

export const initialFen: Fen = getFen(new Chess());
