import { Color, HBox, Path, Text, VBox } from "scenerystack/scenery";
import { Model, SaveStatus } from "../model/Model";
import {
  AquaRadioButtonGroup,
  BooleanRectangularStickyToggleButton,
  ButtonNode,
  RectangularPushButton,
} from "scenerystack/sun";
import { uiForegroundColorProperty } from "./theme.js";
import { DerivedProperty } from "scenerystack/axon";
import { StackMove } from "../model/StackMove.js";
import {
  backwardSolidShape,
  chartBarSolidShape,
  dumbbellSolidShape,
  eraserSolidShape,
  fileDownloadSolidShape,
  forwardSolidShape,
  lockSolidShape,
  runningSolidShape,
  saveSolidShape,
  signOutAltSolidShape,
  stepBackwardSolidShape,
  stepForwardSolidShape,
} from "scenery-fontawesome-5";
import { TooltipListener, ViewContext } from "scenery-toolkit";
import { logOut } from "../model/firebase-actions.js";

export class MainControlsNode extends VBox {
  public constructor(model: Model, viewContext: ViewContext) {
    const downloadBaseColor = new DerivedProperty(
      [model.saveStatusProperty],
      (saveStatus) => {
        if (saveStatus === SaveStatus.NORMAL) {
          return Color.WHITE;
        } else if (saveStatus === SaveStatus.SAVING) {
          return new Color("#aaf");
        } else if (saveStatus === SaveStatus.SUCCESS) {
          return new Color("#afa");
        } else if (saveStatus === SaveStatus.FAILURE) {
          return new Color("#faa");
        } else {
          throw new Error(`Unhandled save status: ${saveStatus}`);
        }
      },
    );

    const genericTooltipListener = new TooltipListener(viewContext);

    const whiteBlackSwitch = new AquaRadioButtonGroup(
      model.isWhiteProperty,
      [
        {
          value: true,
          createNode: () =>
            new Text("White", { fill: uiForegroundColorProperty }),
        },
        {
          value: false,
          createNode: () =>
            new Text("Black", { fill: uiForegroundColorProperty }),
        },
      ],
      {
        orientation: "horizontal",
        spacing: 15,
        enabledProperty: model.isNotDrillProperty,
      },
    );

    const canGoBackProperty = new DerivedProperty(
      [model.stackPositionProperty],
      (stackPosition) => stackPosition >= 1,
    );
    const canGoForwardProperty = new DerivedProperty(
      [model.stackPositionProperty, model.stackProperty],
      (stackPosition: number, stack: StackMove[]) =>
        stackPosition < stack.length,
    );

    const controlButtons = new HBox({
      spacing: 5,
      children: [
        new RectangularPushButton({
          content: new Path(backwardSolidShape, { fill: "black", scale: 0.03 }),
          accessibleName: "Go to Starting Position",
          listener: () => model.goFullBack(),
          baseColor: "#fff",
          enabledProperty: canGoBackProperty,
          buttonAppearanceStrategy: ButtonNode.FlatAppearanceStrategy,
        }),
        new RectangularPushButton({
          content: new Path(stepBackwardSolidShape, {
            fill: "black",
            scale: 0.03,
          }),
          accessibleName: "Go Back",
          listener: () => model.goBack(),
          baseColor: "#fff",
          enabledProperty: canGoBackProperty,
          buttonAppearanceStrategy: ButtonNode.FlatAppearanceStrategy,
        }),
        new RectangularPushButton({
          content: new Path(stepForwardSolidShape, {
            fill: "black",
            scale: 0.03,
          }),
          accessibleName: "Go Forward",
          listener: () => model.goForward(),
          baseColor: "#fff",
          enabledProperty: canGoForwardProperty,
          buttonAppearanceStrategy: ButtonNode.FlatAppearanceStrategy,
        }),
        new RectangularPushButton({
          content: new Path(forwardSolidShape, { fill: "black", scale: 0.03 }),
          accessibleName: "Go to End of Line",
          listener: () => model.goFullForward(),
          baseColor: "#fff",
          enabledProperty: canGoForwardProperty,
          buttonAppearanceStrategy: ButtonNode.FlatAppearanceStrategy,
        }),
      ],
    });
    controlButtons.children.forEach((button) =>
      button.addInputListener(genericTooltipListener),
    );

    const fileButtons = new HBox({
      spacing: 5,
      children: [
        new RectangularPushButton({
          content: new Path(fileDownloadSolidShape, {
            fill: "black",
            scale: 0.03,
          }),
          accessibleName: "Save Changes",
          listener: () => model.exportState(),
          baseColor: downloadBaseColor,
          buttonAppearanceStrategy: ButtonNode.FlatAppearanceStrategy,
        }),
        new RectangularPushButton({
          content: new Path(saveSolidShape, { fill: "black", scale: 0.03 }),
          accessibleName: "Remember This Line",
          listener: () => model.saveTree(),
          baseColor: "#fff",
          enabledProperty: model.isNotDrillProperty,
          buttonAppearanceStrategy: ButtonNode.FlatAppearanceStrategy,
        }),
        new RectangularPushButton({
          content: new Path(eraserSolidShape, { fill: "black", scale: 0.03 }),
          accessibleName: "Forget This Line",
          listener: () => model.deleteTree(),
          baseColor: "#fff",
          enabledProperty: model.isNotDrillProperty,
          buttonAppearanceStrategy: ButtonNode.FlatAppearanceStrategy,
        }),
        new RectangularPushButton({
          content: new Path(signOutAltSolidShape, {
            fill: "black",
            scale: 0.03,
          }),
          accessibleName: "Log Out",
          listener: async () => {
            await logOut();

            // TODO: show sign in!
          },
          baseColor: "#fff",
          buttonAppearanceStrategy: ButtonNode.FlatAppearanceStrategy,
        }),
      ],
    });
    fileButtons.children.forEach((button) =>
      button.addInputListener(genericTooltipListener),
    );

    const drillButtons = new HBox({
      spacing: 5,
      children: [
        new RectangularPushButton({
          content: new Path(runningSolidShape, { fill: "black", scale: 0.03 }),
          accessibleName: "Toggle Drill Mode",
          listener: () => model.toggleDrills(),
          baseColor: "#fff",
          buttonAppearanceStrategy: ButtonNode.FlatAppearanceStrategy,
        }),
        new BooleanRectangularStickyToggleButton(
          model.useDrillWeightsProperty,
          {
            content: new Path(dumbbellSolidShape, {
              fill: "black",
              scale: 0.03,
            }),
            accessibleName: "Toggle Drill Weights",
            baseColor: "#fff",
            enabledProperty: model.isNotDrillProperty,
            buttonAppearanceStrategy: ButtonNode.FlatAppearanceStrategy,
          },
        ),
        new BooleanRectangularStickyToggleButton(
          model.lockDrillToColorProperty,
          {
            content: new Path(lockSolidShape, { fill: "black", scale: 0.03 }),
            accessibleName: "Lock Single Color",
            baseColor: "#fff",
            enabledProperty: model.isNotDrillProperty,
            buttonAppearanceStrategy: ButtonNode.FlatAppearanceStrategy,
          },
        ),
        new RectangularPushButton({
          content: new Path(chartBarSolidShape, { fill: "black", scale: 0.03 }),
          accessibleName: "Show Statistics",
          listener: () => () => {},
          baseColor: "#fff",
          enabledProperty: model.isNotDrillProperty,
          buttonAppearanceStrategy: ButtonNode.FlatAppearanceStrategy,
        }),
      ],
    });
    drillButtons.children.forEach((button) =>
      button.addInputListener(genericTooltipListener),
    );

    // TODO: move to somewhere more global perhaps? OR USE OUR SCENERY SUPPORT
    // Listen for the enter key press.
    document.body.addEventListener("keydown", (e) => {
      // console.log( e.keyCode );

      if (e.keyCode === 37 && canGoBackProperty.value) {
        model.goBack();
      }
      if (e.keyCode === 39 && canGoForwardProperty.value) {
        model.goForward();
      }
    });

    super({
      spacing: 5,
      children: [whiteBlackSwitch, controlButtons, fileButtons, drillButtons],
    });
  }
}
