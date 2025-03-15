import { Text, VBox } from "scenerystack/scenery";
import { Model } from "../model/Model";
import { AquaRadioButtonGroup } from "scenerystack/sun";
import { uiForegroundColorProperty } from "./theme";

export class MovesSettingsNode extends VBox {
  public constructor(model: Model) {
    const lichessExploreTypeSwitch = new AquaRadioButtonGroup(
      model.lichessExploreTypeProperty,
      [
        {
          value: "masters",
          createNode: () =>
            new Text("Masters", { fill: uiForegroundColorProperty }),
        },
        {
          value: "blitzLow",
          createNode: () =>
            new Text("Blitz Low", { fill: uiForegroundColorProperty }),
        },
        {
          value: "blitzHigh",
          createNode: () =>
            new Text("Blitz High", { fill: uiForegroundColorProperty }),
        },
        {
          value: "rapidLow",
          createNode: () =>
            new Text("Rapid Low", { fill: uiForegroundColorProperty }),
        },
        {
          value: "rapidHigh",
          createNode: () =>
            new Text("Rapid High", { fill: uiForegroundColorProperty }),
        },
      ],
      {
        orientation: "horizontal",
        spacing: 15,
      },
    );

    super({
      spacing: 10,
      children: [lichessExploreTypeSwitch],
      visibleProperty: model.isNotDrillProperty,
    });
  }
}
