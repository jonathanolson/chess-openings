import {
  FireListener,
  GridBox,
  Node,
  Rectangle,
  Text,
} from "scenerystack/scenery";
import { getFen } from "../model/getFen";
import { TReadOnlyProperty } from "scenerystack/axon";
import {
  boldFont,
  stackNodeBackgroundProperty,
  stackNodeBorderProperty,
  stackNodeForegroundProperty,
  stackNodeHoverColorProperty,
  stackNodeInNodesColorProperty,
  stackNodeLabelColorProperty,
  stackNodeNotInNodesColorProperty,
  stackNodeTailInNodesColorProperty,
  stackNodeTailNotInNodesColorProperty,
  strongBackgroundColorProperty,
  unboldFont,
} from "./theme";
import { Model } from "../model/Model";
import { Move } from "../model/common";

const leftWidth = 25;
const rightWidth = 52;
const height = 20;

class LabelNode extends Rectangle {
  public constructor(i: number) {
    super(0, 0, leftWidth, height, {
      fill: strongBackgroundColorProperty,
      layoutOptions: {
        column: 0,
        row: i,
      },
      children: [
        new Text(i + 1, {
          centerX: leftWidth / 2,
          centerY: height / 2,
          font: boldFont,
          fill: stackNodeLabelColorProperty,
        }),
      ],
    });
  }
}

class StackMoveNode extends Rectangle {
  private readonly label: Text;

  // state
  private move: Move = "m";
  private isInNodes: boolean = false;
  private stackPosition: number = 0;

  private looksOverProperty: TReadOnlyProperty<boolean>;

  public constructor(
    model: Model,
    private readonly i: number,
  ) {
    const label = new Text("m", {
      fill: stackNodeForegroundProperty,
    });

    const fireListener = new FireListener({
      fire: () => {
        model.selectStackIndex(i);
      },
    });

    super(0, 0, rightWidth, height, {
      layoutOptions: {
        column: 1 + (i % 2),
        row: Math.floor(i / 2),
      },
      children: [label],
      cursor: "pointer",
      inputListeners: [fireListener],
    });

    this.label = label;
    this.looksOverProperty = fireListener.looksOverProperty;

    fireListener.looksOverProperty.lazyLink(this.updateAppearance.bind(this));
  }

  public setState(move: Move, isInNodes: boolean, stackPosition: number) {
    this.move = move;
    this.isInNodes = isInNodes;
    this.stackPosition = stackPosition;

    this.updateAppearance();
  }

  private updateAppearance(): void {
    this.label.string = this.move;
    this.label.font = this.isInNodes ? boldFont : unboldFont;

    // TODO: can we ditch this? it will likely no-op though?
    this.label.left = 5;
    this.label.centerY = height / 2;

    // TODO: theming!
    this.fill =
      this.stackPosition - 1 === this.i
        ? this.isInNodes
          ? stackNodeTailInNodesColorProperty
          : stackNodeTailNotInNodesColorProperty
        : this.looksOverProperty.value
          ? stackNodeHoverColorProperty
          : this.isInNodes
            ? stackNodeInNodesColorProperty
            : stackNodeNotInNodesColorProperty;
  }
}

export class StackNode extends Node {
  public constructor(model: Model) {
    const grid = new GridBox({
      xAlign: "left",
    });

    const backgroundNode = new Rectangle(0, 0, 0, 0, {
      stroke: stackNodeBorderProperty,
      fill: stackNodeBackgroundProperty,
      lineWidth: 1,
    });

    const labelNodes: LabelNode[] = [];
    const getLabelNodes = (n: number): LabelNode[] => {
      for (let i = labelNodes.length; i < n; i++) {
        labelNodes.push(new LabelNode(i));
      }

      return labelNodes.slice(0, n);
    };

    const stackMoveNodes: StackMoveNode[] = [];
    const getStackMoveNodes = (n: number): StackMoveNode[] => {
      for (let i = stackMoveNodes.length; i <= n; i++) {
        stackMoveNodes.push(new StackMoveNode(model, i));
      }

      return stackMoveNodes.slice(0, n);
    };

    const update = () => {
      const stack = model.stackProperty.value;
      const stackPosition = model.stackPositionProperty.value;
      const nodes = model.nodesProperty.value;

      if (stack.length === 0) {
        return new Node();
      }

      const labelNodes = getLabelNodes(Math.ceil(stack.length / 2));

      const stackMoveNodes = getStackMoveNodes(stack.length);
      stack.forEach((stackMove, i) => {
        // TODO: more efficient way?
        const isInNodes = !!nodes[getFen(stackMove.board)];

        stackMoveNodes[i].setState(stackMove.move, isInNodes, stackPosition);
      });

      grid.children = [...labelNodes, ...stackMoveNodes];

      backgroundNode.rectBounds = grid.bounds
        .withMaxX(leftWidth + 2 * rightWidth)
        .dilated(0.5);
    };

    model.stackProperty.lazyLink(update);
    model.stackPositionProperty.lazyLink(update);
    model.nodesProperty.lazyLink(update);
    update();

    super({
      children: [backgroundNode, grid],
    });
  }
}
