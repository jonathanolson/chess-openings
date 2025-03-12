import { Node, NodeOptions, Rectangle } from "scenerystack/scenery";
import { LichessExploreWins } from "../model/getLichessExplore";
import { Bounds2 } from "scenerystack/dot";
import { combineOptions } from "scenerystack/phet-core";

export type WinStatisticsBarOptions = NodeOptions;

export class WinStatisticsBar extends Node {
  public constructor(
    lichessWins: LichessExploreWins | null,
    whiteOnLeft: boolean,
    providedOptions?: WinStatisticsBarOptions,
  ) {
    const barWidth = 150;
    const barHeight = 15;

    const bar = new Rectangle(0, 0, barWidth, barHeight, {
      layoutOptions: { column: 1, row: 0 },
    });
    if (lichessWins) {
      const stroke = "#888";
      const whiteFill = "#fff";
      const drawFill = "#888";
      const blackFill = "#000";

      const total =
        lichessWins.whiteWins + lichessWins.blackWins + lichessWins.draws;
      const toX = (count: number) => (barWidth * count) / total;
      if (whiteOnLeft) {
        bar.addChild(
          Rectangle.bounds(
            new Bounds2(toX(0), 0, toX(lichessWins.whiteWins), barHeight),
            {
              fill: whiteFill,
              stroke: stroke,
            },
          ),
        );
        bar.addChild(
          Rectangle.bounds(
            new Bounds2(
              toX(lichessWins.whiteWins),
              0,
              toX(lichessWins.whiteWins + lichessWins.draws),
              barHeight,
            ),
            {
              fill: drawFill,
              stroke: stroke,
            },
          ),
        );
        bar.addChild(
          Rectangle.bounds(
            new Bounds2(
              toX(lichessWins.whiteWins + lichessWins.draws),
              0,
              toX(total),
              barHeight,
            ),
            {
              fill: blackFill,
              stroke: stroke,
            },
          ),
        );
      } else {
        bar.addChild(
          Rectangle.bounds(
            new Bounds2(toX(0), 0, toX(lichessWins.blackWins), barHeight),
            {
              fill: blackFill,
              stroke: stroke,
            },
          ),
        );
        bar.addChild(
          Rectangle.bounds(
            new Bounds2(
              toX(lichessWins.blackWins),
              0,
              toX(lichessWins.blackWins + lichessWins.draws),
              barHeight,
            ),
            {
              fill: drawFill,
              stroke: stroke,
            },
          ),
        );
        bar.addChild(
          Rectangle.bounds(
            new Bounds2(
              toX(lichessWins.blackWins + lichessWins.draws),
              0,
              toX(total),
              barHeight,
            ),
            {
              fill: whiteFill,
              stroke: stroke,
            },
          ),
        );
      }
    }

    super(
      combineOptions<NodeOptions>(
        {
          children: [bar],
        },
        providedOptions,
      ),
    );
  }
}
