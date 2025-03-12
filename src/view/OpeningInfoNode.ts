import { FireListener, Text, VBox } from "scenerystack/scenery";
import { boldFont, uiForegroundColorProperty } from "./theme";
import { copyToClipboard } from "./copyToClipboard";
import { getFen } from "../model/getFen";
import { DerivedProperty } from "scenerystack/axon";
import { Model } from "../model/Model";
import { getOpeningInfo } from "../model/getOpeningInfo";

export class OpeningInfoNode extends VBox {
  public constructor(model: Model) {
    const fenText = new Text("", {
      fontSize: 8,
      fill: uiForegroundColorProperty,
      cursor: "pointer",
      inputListeners: [
        new FireListener({
          fire: () => copyToClipboard(getFen(model.boardProperty.value)),
        }),
      ],
    });
    model.boardProperty.link((board) => {
      fenText.string = getFen(board);
    });

    const selectedOpeningNameProperty = new DerivedProperty(
      [model.selectedStackMoveProperty],
      (stackMove) => {
        const openingInfo = stackMove
          ? getOpeningInfo(stackMove.history)
          : null;

        if (openingInfo) {
          return openingInfo.name;
        } else {
          return "-";
        }
      },
    );

    const openingNameText = new Text(selectedOpeningNameProperty, {
      font: boldFont,
      fill: uiForegroundColorProperty,
      visibleProperty: model.isNotDrillProperty,
    });

    super({
      align: "left",
      spacing: 3,
      children: [fenText, openingNameText],
    });
  }
}
