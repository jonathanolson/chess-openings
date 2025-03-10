import {
  FireListener,
  GridBox,
  Node,
  Rectangle,
  Text,
} from "scenerystack/scenery";
import { StackMove } from "../model/StackMove";
import { getFen } from "../model/getFen";
import { DerivedProperty } from "scenerystack/axon";
import { boldFont, nicePurple, niceRed, unboldFont } from "./theme";
import { Nodes } from "../model/ChessNode";
import _ from "lodash";

export class StackNode extends Node {
  public constructor(
    stack: StackMove[],
    stackPosition: number,
    nodes: Nodes,
    selectStackIndex: (index: number) => void,
  ) {
    if (stack.length === 0) {
      return new Node();
    }
    const leftWidth = 25;
    const rightWidth = 52;
    const height = 20;

    const gridChildren: Node[] = [];

    _.range(0, Math.ceil(stack.length / 2)).forEach((i) => {
      gridChildren.push(
        new Rectangle(0, 0, leftWidth, height, {
          fill: "#fff",
          layoutOptions: {
            column: 0,
            row: i,
          },
          children: [
            new Text(i + 1, {
              centerX: leftWidth / 2,
              centerY: height / 2,
              font: boldFont,
              fill: "#888",
            }),
          ],
        }),
      );
    });

    stack.forEach((stackMove, i) => {
      const isInNodes = !!nodes[getFen(stackMove.board)];

      const fireListener = new FireListener({
        fire: () => {
          selectStackIndex(i);
        },
      });

      const fill = new DerivedProperty(
        [fireListener.looksOverProperty],
        (looksOver) => {
          return stackPosition - 1 === i
            ? isInNodes
              ? nicePurple
              : niceRed
            : looksOver
              ? "#ccc"
              : isInNodes
                ? "#ddd"
                : "#eee";
        },
      );

      gridChildren.push(
        new Rectangle(0, 0, rightWidth, height, {
          fill: fill,
          layoutOptions: {
            column: 1 + (i % 2),
            row: Math.floor(i / 2),
          },
          children: [
            new Text(stackMove.move, {
              left: 5,
              centerY: height / 2,
              font: isInNodes ? boldFont : unboldFont,
            }),
          ],
          cursor: "pointer",
          inputListeners: [fireListener],
        }),
      );
    });

    const grid = new GridBox({
      xAlign: "left",
      children: gridChildren,
    });

    super({
      children: [
        Rectangle.bounds(
          grid.bounds.withMaxX(leftWidth + 2 * rightWidth).dilated(0.5),
          { stroke: "#666", lineWidth: 1 },
        ),
        grid,
      ],
    });
  }
}
