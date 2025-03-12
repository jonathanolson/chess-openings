import { FlowBox, Path, Text, VBox } from "scenerystack/scenery";
import { Model } from "../model/Model";
import { getOpeningInfo } from "../model/getOpeningInfo";
import { DerivedProperty } from "scenerystack/axon";
import { boldFont } from "./theme";
import { ButtonNode, RectangularPushButton } from "scenerystack/sun";
import {
  searchSolidShape,
  thumbsDownSolidShape,
  thumbsUpSolidShape,
} from "scenery-fontawesome-5";

export class LastDrillNode extends VBox {
  public constructor(model: Model) {
    const hasLastDrillProperty = new DerivedProperty(
      [model.lastDrillProperty],
      (lastDrill) => !!lastDrill,
    );

    const lastDrillOpeningNameProperty = new DerivedProperty(
      [model.lastDrillProperty],
      (lastDrill) => {
        if (lastDrill) {
          return (
            getOpeningInfo(lastDrill[lastDrill.length - 1].history)?.name ?? "-"
          );
        } else {
          return "-";
        }
      },
    );

    super({
      spacing: 10,
      children: [
        new Text(lastDrillOpeningNameProperty, {
          font: boldFont,
          visibleProperty: hasLastDrillProperty,
        }),
        new FlowBox({
          orientation: "horizontal",
          visibleProperty: hasLastDrillProperty,
          spacing: 5,
          children: [
            new RectangularPushButton({
              content: new Path(searchSolidShape, {
                fill: "black",
                scale: 0.03,
              }),
              listener: () => model.examineDrill(),
              baseColor: "#fff",
              buttonAppearanceStrategy: ButtonNode.FlatAppearanceStrategy,
            }),
            new RectangularPushButton({
              content: new Path(thumbsUpSolidShape, {
                fill: "black",
                scale: 0.03,
              }),
              listener: () => model.makeDrillEasier(),
              baseColor: "#fff",
              buttonAppearanceStrategy: ButtonNode.FlatAppearanceStrategy,
            }),
            new RectangularPushButton({
              content: new Path(thumbsDownSolidShape, {
                fill: "black",
                scale: 0.03,
              }),
              listener: () => model.makeDrillHarder(),
              baseColor: "#fff",
              buttonAppearanceStrategy: ButtonNode.FlatAppearanceStrategy,
            }),
          ],
        }),
      ],
    });
  }
}
