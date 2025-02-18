import { ChessNode, Nodes } from "./ChessNode";
import { CompactState, CompactStateEntry } from "./common";
import { initialFen } from "./initialFen";
import _ from "lodash";

export const nodesToCompactState = (
  nodes: Nodes,
  isWhite: boolean,
): CompactState => {
  const nodesInOrder: ChessNode[] = [];
  Object.keys(nodes).forEach((fen) => {
    nodes[fen].serializationId = -1;
  });

  let id = 0;
  const nodesToVisit = [nodes[initialFen]];
  nodesToVisit[0].isTurnWhite = true;

  while (nodesToVisit.length) {
    const node = nodesToVisit.shift()!;

    // Only set the ID the first time
    if (node.serializationId === -1) {
      node.serializationId = id++;
      nodesInOrder.push(node);
    }

    node.children.forEach((child) => {
      child.isTurnWhite = !node.isTurnWhite;
      nodesToVisit.push(child);
    });
  }

  return nodesInOrder.map((node) => {
    const obj: CompactStateEntry = {};
    if (node.moves.length) {
      obj.m = _.flatten(
        node.moves.map((move) => {
          return [move, node.moveMap[move].serializationId];
        }),
      );
    }
    if (node.isTurnWhite === isWhite) {
      obj.p = node.priority;
    }
    return obj;
  });
};
