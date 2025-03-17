import { ChessNode, Nodes } from "./ChessNode";
import { CompactState } from "./common";
import { initialFen } from "./initialFen";
import { Chess } from "chess.js";
import { getFen } from "./getFen.js";

export const compactStateToNodes = (
  nodes: Nodes,
  obj: CompactState,
  isWhite: boolean,
  allowDuplicates: boolean = false,
) => {
  const fens = obj.map(() => "");
  fens[0] = initialFen;

  obj.forEach((entry, index) => {
    const fen = fens[index];
    if (!fen) {
      throw new Error("No fen?");
    }

    if (!allowDuplicates && nodes[fen]) {
      throw new Error(`duplicate ${index} ${fen}`);
    }

    const oldNode = nodes[fen];

    const node = oldNode ?? new ChessNode(fen, nodes, isWhite);
    nodes[fen] = node;

    if (entry.p) {
      if (oldNode) {
        // TODO: see if additive priorities are OK
        node.priority += entry.p;
      } else {
        node.priority = entry.p;
      }
    }
    if (entry.m) {
      for (let i = 0; i < entry.m.length; i += 2) {
        const move = entry.m[i] as string;
        const id = entry.m[i + 1] as number;

        if (!allowDuplicates && node.moves.includes(move)) {
          throw new Error(`duplicate move ${move} ${fen}`);
        }
        if (!node.moves.includes(move)) {
          node.moves.push(move);
        }

        const subBoard = new Chess(fen);
        const verboseMove = subBoard.move(move);
        if (!verboseMove) {
          throw new Error("Invalid move during loading?");
        }

        if (fens[id]) {
          if (fens[id] !== getFen(subBoard)) {
            throw new Error("Fen mismatch?");
          }
        }
        fens[id] = getFen(subBoard);
      }
    }
  });

  // Connect nodes
  Object.keys(nodes).forEach((fen) => {
    const node = nodes[fen];
    // Clear out existing info!!! -- do this once
    // TODO: do we need to reinstate this?
    // if ( ( new Chess( fen ).turn() === 'w' ) !== isWhite ) {
    //   node.priority = 0;
    // }
    node.moves.forEach((move) => {
      const board = new Chess(fen);
      const verboseMove = board.move(move);
      if (!verboseMove) {
        throw new Error("Invalid move during loading?");
      }
      const childNode = nodes[getFen(board)];
      ChessNode.connect(node, childNode, move);
    });
  });
};
