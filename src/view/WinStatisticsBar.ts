import { Line, Node, NodeOptions, Path, Rectangle } from "scenerystack/scenery";
import { LichessExploreWins } from "../model/getLichessExplore";
import { Bounds2 } from "scenerystack/dot";
import { combineOptions } from "scenerystack/phet-core";
import { Shape } from "scenerystack/kite";

export type WinStatisticsBarOptions = NodeOptions;

export class WinStatisticsBar extends Node {
  public constructor(
    lichessWins: LichessExploreWins | null,
    whiteOnLeft: boolean,
    winPercentage: number | null,
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

      if (winPercentage !== null) {
        // Apply padding of 0.5 so we don't go OVER things
        const winPercentageX = 0.5 + ((barWidth - 1) * winPercentage) / 100;
        bar.addChild(
          new Line(winPercentageX, 0, winPercentageX, barHeight * 0.75, {
            stroke: "#f00",
            lineCap: "butt",
          }),
        );

        if (winPercentageX > 5 && winPercentage < barWidth - 5) {
          const triangleShape = new Shape()
            .moveTo(-5, 0)
            .lineTo(5, 0)
            .lineTo(0, 5)
            .close();
          bar.addChild(
            new Path(triangleShape, {
              fill: "#f00",
              x: winPercentageX,
            }),
          );
        }
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
