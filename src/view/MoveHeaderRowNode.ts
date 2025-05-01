import {
  Color,
  FireListener,
  HBox,
  Node,
  Rectangle,
  Text,
} from "scenerystack/scenery";
import {
  moveNodeSelectedSortHeaderProperty,
  uiForegroundColorProperty,
  unboldFont,
} from "./theme.js";
import {
  MOVE_ROW_MOVE_TEXT_WIDTH,
  MOVE_ROW_POPULARITY_WIDTH,
  MOVE_ROW_PRIORITY_WIDTH,
  MOVE_ROW_SPACING,
  MOVE_ROW_STOCKFISH_EVAL_WIDTH,
  MOVE_ROW_SUBTREE_WEIGHT_WIDTH,
  moveRowWinStatisticsBarWidthProperty,
} from "./MoveRowConstants.js";
import { Model, MoveRowSort } from "../model/Model.js";
import { DerivedProperty, TReadOnlyProperty } from "scenerystack/axon";
import { Bounds2 } from "scenerystack/dot";

export class MoveHeaderRowNode extends HBox {
  public constructor(model: Model) {
    const createHeader = (
      string: string,
      width: number | TReadOnlyProperty<number>,
      sorts: MoveRowSort[],
    ): Node => {
      const text = new Text(string, {
        font: unboldFont,
        pickable: false,
        fill: uiForegroundColorProperty,
      });
      const backgroundNode = new Rectangle({
        rectBounds: new Bounds2(0, text.top, 0, text.bottom),
        cursor: "pointer",
        fill: new DerivedProperty(
          [model.moveRowSortProperty, moveNodeSelectedSortHeaderProperty],
          (sort, color) => {
            return sorts.includes(sort) ? color : Color.TRANSPARENT;
          },
        ),
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

      backgroundNode.addInputListener(
        new FireListener({
          fire: () => {
            const nextIndex =
              (sorts.indexOf(model.moveRowSortProperty.value) + 1) %
              sorts.length;

            model.moveRowSortProperty.value = sorts[nextIndex];
          },
        }),
      );

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
        createHeader("Move", MOVE_ROW_MOVE_TEXT_WIDTH, [MoveRowSort.MOVE]),
        createHeader("Tree", MOVE_ROW_SUBTREE_WEIGHT_WIDTH, [
          MoveRowSort.SUBTREE,
        ]),
        createHeader("Win Stats", moveRowWinStatisticsBarWidthProperty, [
          MoveRowSort.WIN_STATISTICS,
          MoveRowSort.WIN_DRAW_STATISTICS,
        ]),
        createHeader("Eval", MOVE_ROW_STOCKFISH_EVAL_WIDTH, [
          MoveRowSort.STOCKFISH_EVAL,
        ]),
        createHeader("Popularity", MOVE_ROW_POPULARITY_WIDTH, [
          MoveRowSort.POPULARITY_STATISTICS,
        ]),
        createHeader("Priority", MOVE_ROW_PRIORITY_WIDTH, [
          MoveRowSort.PRIORITY,
        ]),
      ],
    });
  }
}
