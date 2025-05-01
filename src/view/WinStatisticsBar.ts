import {
  Line,
  Node,
  NodeOptions,
  Path,
  Rectangle,
  Text,
} from "scenerystack/scenery";
import { LichessExploreWins } from "../model/getLichessExplore";
import { Bounds2, toFixed } from "scenerystack/dot";
import { Shape } from "scenerystack/kite";
import { boldFont } from "./theme.js";
import { moveRowWinStatisticsBarInternalWidthProperty } from "./MoveRowConstants.js";

export type WinStatisticsBarOptions = NodeOptions;

const stroke = "#888";
const whiteFill = "#fff";
const drawFill = "#888";
const blackFill = "#000";
const whiteTextFill = "rgba(0,0,0,0.3)";
const blackTextFill = "rgba(255,255,255,0.45)";
const barHeight = 15;
const textPadding = 3;

const triangleExtent = 4;

const triangleShape = new Shape()
  .moveTo(-triangleExtent, 0)
  .lineTo(triangleExtent, 0)
  .lineTo(0, triangleExtent)
  .close()
  .makeImmutable();

export class WinStatisticsBar extends Node {
  private leftRectangle: Rectangle = new Rectangle({
    stroke: stroke,
  });
  private drawRectangle: Rectangle = new Rectangle({
    stroke: stroke,
    fill: drawFill,
  });
  private rightRectangle: Rectangle = new Rectangle({
    stroke: stroke,
  });
  private leftText: Text = new Text("%", {
    font: boldFont,
    scale: 0.7,
  });
  private rightText: Text = new Text("%", {
    font: boldFont,
    scale: 0.7,
  });
  private winPercentageLine: Line = new Line({
    y2: barHeight * 0.75,
    stroke: "#f00",
    lineCap: "butt",
  });
  private winPercentageTriangle: Path = new Path(triangleShape, {
    fill: "#f00",
    x: triangleExtent, // just an initial value that puts us within the basic bounds
  });

  public constructor(
    lichessWins: LichessExploreWins | null,
    whiteOnLeft: boolean,
    winPercentage: number | null,
    providedOptions?: WinStatisticsBarOptions,
  ) {
    super(providedOptions);

    this.children = [
      this.leftRectangle,
      this.drawRectangle,
      this.rightRectangle,
      this.leftText,
      this.rightText,
      this.winPercentageLine,
      this.winPercentageTriangle,
    ];

    this.setData(lichessWins, whiteOnLeft, winPercentage);
  }

  public setData(
    lichessWins: LichessExploreWins | null,
    whiteOnLeft: boolean,
    winPercentage: number | null,
  ): void {
    const barWidth = moveRowWinStatisticsBarInternalWidthProperty.value;

    const totalResults = lichessWins
      ? lichessWins.whiteWins + lichessWins.blackWins + lichessWins.draws
      : 0;
    const hasResults = totalResults > 0;
    const barWidthSupportsText = barWidth > 50;

    this.leftRectangle.visible = hasResults;
    this.drawRectangle.visible = hasResults;
    this.rightRectangle.visible = hasResults;
    this.leftText.visible = hasResults && barWidthSupportsText;
    this.rightText.visible = hasResults && barWidthSupportsText;

    // TODO: proper positioning if no results

    const farLeft = 0;
    let drawLeft = 0;
    let drawRight = barWidth;
    const farRight = barWidth;

    if (hasResults && lichessWins) {
      this.leftRectangle.fill = whiteOnLeft ? whiteFill : blackFill;
      this.rightRectangle.fill = whiteOnLeft ? blackFill : whiteFill;
      this.leftText.fill = whiteOnLeft ? whiteTextFill : blackTextFill;
      this.rightText.fill = whiteOnLeft ? blackTextFill : whiteTextFill;

      const toX = (count: number) => (barWidth * count) / totalResults;

      const leftWins = whiteOnLeft
        ? lichessWins.whiteWins
        : lichessWins.blackWins;
      drawLeft = toX(leftWins);
      drawRight = toX(leftWins + lichessWins.draws);

      if (barWidthSupportsText) {
        this.leftText.string = `${toFixed((leftWins / totalResults) * 100, 1)}%`;
        this.rightText.string = `${toFixed(
          ((totalResults - leftWins - lichessWins.draws) / totalResults) * 100,
          1,
        )}%`;
        this.leftText.left = textPadding;
        this.leftText.centerY = barHeight / 2;
        this.rightText.right = barWidth - textPadding;
        this.rightText.centerY = barHeight / 2;
      }
    }
    this.leftRectangle.rectBounds = new Bounds2(
      farLeft,
      0,
      drawLeft,
      barHeight,
    );
    this.drawRectangle.rectBounds = new Bounds2(
      drawLeft,
      0,
      drawRight,
      barHeight,
    );
    this.rightRectangle.rectBounds = new Bounds2(
      drawRight,
      0,
      farRight,
      barHeight,
    );

    if (hasResults && barWidthSupportsText) {
      // NOTE: Should have been computed above?
    } else {
      this.leftText.string = "%";
      this.rightText.string = "%";
      this.leftText.left = textPadding;
      this.rightText.left = textPadding;
      this.leftText.top = 0;
      this.rightText.top = 0;
    }

    const hasWinPercentage = winPercentage !== null;
    this.winPercentageLine.visible = hasWinPercentage;
    this.winPercentageTriangle.visible = hasWinPercentage;

    if (hasWinPercentage) {
      // Apply padding of 0.5 so we don't go OVER things
      const winPercentageX = 0.5 + ((barWidth - 1) * winPercentage) / 100;

      this.winPercentageLine.setLine(
        winPercentageX,
        0,
        winPercentageX,
        barHeight * 0.75,
      );

      if (
        winPercentageX > triangleExtent &&
        winPercentage < barWidth - triangleExtent
      ) {
        this.winPercentageTriangle.x = winPercentageX;
      } else {
        this.winPercentageTriangle.x = triangleExtent;
        this.winPercentageTriangle.visible = false;
      }
    }
  }
}
