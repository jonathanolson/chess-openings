import { Node, NodeOptions, Rectangle, Text } from "scenerystack/scenery";
import { toFixed } from "scenerystack/dot";
import {
  boldFont,
  moveNodePopularityBarColorProperty,
  moveNodePopularityCountColorProperty,
  uiForegroundColorProperty,
  unboldFont,
} from "./theme.js";

export type PopularityStatisticsBarOptions = NodeOptions;

const barHeight = 15;
const percentageWidth = 40;
const padding = 3;
const barWidth = 60;

export class PopularityStatisticsBar extends Node {
  private percentageText: Text = new Text("%", {
    fill: uiForegroundColorProperty,
    font: unboldFont,
    maxWidth: percentageWidth,
  });
  private layoutBar: Rectangle = new Rectangle({
    rectWidth: percentageWidth + padding + barWidth,
    rectHeight: barHeight,
  });
  private displayBar: Rectangle = new Rectangle({
    fill: moveNodePopularityBarColorProperty,
    rectX: percentageWidth + padding,
    rectHeight: barHeight,
  });
  private countText: Text = new Text("0", {
    fill: moveNodePopularityCountColorProperty,
    font: boldFont,
    maxWidth: barWidth - padding * 2,
    scale: 0.7,
  });

  public constructor(
    count: number,
    totalCount: number,
    providedOptions?: PopularityStatisticsBarOptions,
  ) {
    super(providedOptions);

    this.children = [
      this.percentageText,
      this.layoutBar,
      this.displayBar,
      this.countText,
    ];

    this.setData(count, totalCount);
  }

  public setData(count: number, totalCount: number): void {
    const hasData = totalCount > 0;

    this.displayBar.visible = hasData;
    this.countText.visible = hasData && count > 0;

    if (hasData) {
      this.percentageText.string =
        count === 0 ? "0" : `${toFixed((count / totalCount) * 100, 2)}%`;
      this.countText.string = `${count}`;

      const minBarWidth = 8;

      this.displayBar.rectWidth =
        minBarWidth +
        ((barWidth - minBarWidth) * Math.log(count + 1)) /
          Math.log(totalCount + 1);

      const opacityAmount = Math.min(1, Math.log(1 + count) / 12);

      this.displayBar.opacity = 0.3 + 0.7 * opacityAmount;
      this.countText.opacity = 1 - 0.8 * opacityAmount;
    } else {
      this.percentageText.string = "-";
    }
    this.percentageText.right = percentageWidth;
    this.percentageText.centerY = barHeight / 2;
    this.countText.left = percentageWidth + 2 * padding;
    this.countText.centerY = barHeight / 2;
  }
}
