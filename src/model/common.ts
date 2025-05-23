export type Fen = string;
export type Move = string;
export type Square =
  | "a1"
  | "b1"
  | "c1"
  | "d1"
  | "e1"
  | "f1"
  | "g1"
  | "h1"
  | "a2"
  | "b2"
  | "c2"
  | "d2"
  | "e2"
  | "f2"
  | "g2"
  | "h2"
  | "a3"
  | "b3"
  | "c3"
  | "d3"
  | "e3"
  | "f3"
  | "g3"
  | "h3"
  | "a4"
  | "b4"
  | "c4"
  | "d4"
  | "e4"
  | "f4"
  | "g4"
  | "h4"
  | "a5"
  | "b5"
  | "c5"
  | "d5"
  | "e5"
  | "f5"
  | "g5"
  | "h5"
  | "a6"
  | "b6"
  | "c6"
  | "d6"
  | "e6"
  | "f6"
  | "g6"
  | "h6"
  | "a7"
  | "b7"
  | "c7"
  | "d7"
  | "e7"
  | "f7"
  | "g7"
  | "h7"
  | "a8"
  | "b8"
  | "c8"
  | "d8"
  | "e8"
  | "f8"
  | "g8"
  | "h8";
export type VerboseMove = {
  color: "w" | "b";
  from: Square;
  to: Square;
  flags: string;
  piece: string;
  san: Move;
  promotion?: string;
};
export type LichessExplore = {
  white: number;
  draws: number;
  black: number;
  moves: {
    uci: string;
    san: Move;
    averageRating: number;
    white: number;
    draws: number;
    black: number;
    game?: unknown;
  }[];
  topGames?: unknown[];
  opening: {
    eco: string;
    name: string;
  };
};
export type CompactStateEntry = {
  m?: (string | number)[];
  p?: number;
};
export type CompactState = CompactStateEntry[];
export type SaveState = {
  white: CompactStateEntry[];
  black: CompactStateEntry[];
};
export type CompactFenMoveEntry = {
  i?: number; // index of the move into the main list
  bl?: [number, number, number]; // blitzLow
  bh?: [number, number, number]; // blitzHigh
  ma?: [number, number, number]; // masters
  rl?: [number, number, number]; // rapidLow
  rh?: [number, number, number]; // rapidHigh
};
export type CompactFenEntry = {
  // stockfish (depth 36) evals
  s?: number; // score
  sm?: "mate"; // if mate

  m?: Record<Move, CompactFenMoveEntry>;
};
export type CompactFenData = CompactFenEntry[];
