import { HBox, Node, Rectangle, Text } from "scenerystack/scenery";
import { unboldFont } from "./theme.js";
import {
  MOVE_ROW_MOVE_TEXT_WIDTH,
  MOVE_ROW_POPULARITY_WIDTH,
  MOVE_ROW_PRIORITY_WIDTH,
  MOVE_ROW_SPACING,
  MOVE_ROW_STOCKFISH_EVAL_WIDTH,
  MOVE_ROW_SUBTREE_WEIGHT_WIDTH,
  moveRowWinStatisticsBarWidthProperty,
} from "./MoveRowConstants.js";
import { Model } from "../model/Model.js";
import { TReadOnlyProperty } from "scenerystack/axon";
import { Bounds2 } from "scenerystack/dot";

export class MoveHeaderRowNode extends HBox {
  public constructor(model: Model) {
    const createHeader = (
      string: string,
      width: number | TReadOnlyProperty<number>,
    ): Node => {
      const text = new Text(string, {
        font: unboldFont,
      });
      const backgroundNode = new Rectangle({
        rectBounds: new Bounds2(0, text.top, 0, text.bottom),
      });

      const setWidth = (currentWidth: number) => {
        const padding = 1.5;

        text.maxWidth = currentWidth - 2 * padding;
        text.centerX = currentWidth / 2;
        backgroundNode.rectWidth = currentWidth;
      };
      if (typeof width === "number") {
        setWidth(width);
      } else {
        width.link((currentWidth) => {
          setWidth(currentWidth);
        });
      }

      return new Node({
        children: [backgroundNode, text],
      });
    };

    const winStatisticsLabel = new Text("Win Statistics", {
      font: unboldFont,
    });
    moveRowWinStatisticsBarWidthProperty.link((width) => {
      winStatisticsLabel.maxWidth = width;
    });

    super({
      spacing: MOVE_ROW_SPACING,
      children: [
        createHeader("Move", MOVE_ROW_MOVE_TEXT_WIDTH),
        createHeader("Tree", MOVE_ROW_SUBTREE_WEIGHT_WIDTH),
        createHeader("Win Stats", moveRowWinStatisticsBarWidthProperty),
        createHeader("Eval", MOVE_ROW_STOCKFISH_EVAL_WIDTH),
        createHeader("Popularity", MOVE_ROW_POPULARITY_WIDTH),
        createHeader("Priority", MOVE_ROW_PRIORITY_WIDTH),
      ],
    });
  }
}
