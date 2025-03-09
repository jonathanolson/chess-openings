import { converter, formatHex, parse } from "culori";
import { Color, Font, PaintDef, TColor } from "scenerystack/scenery";
import { Vector2 } from "scenerystack/dot";
import { DerivedProperty, DerivedProperty1 } from "scenerystack/axon";
import { isOSDarkModeProperty } from "./isOSDarkModeProperty.js";

const nicePurpleK = converter("oklab")(parse("#c87adb"))!;
const nicePurpleHueChroma = new Vector2(nicePurpleK.a, nicePurpleK.b);
const niceRedHueChroma = nicePurpleHueChroma.rotated(1);
const niceRedK = {
  mode: "oklab",
  l: nicePurpleK.l,
  a: niceRedHueChroma.x,
  b: niceRedHueChroma.y,
};

export const nicePurple = formatHex(nicePurpleK);
// @ts-expect-error Somethings seems wrong with type desc
export const niceRed = formatHex(niceRedK);

export const unboldFont = new Font({
  family: "Helvetica, Arial, sans-serif",
  size: 12,
});
export const boldFont = new Font({
  family: "Helvetica, Arial, sans-serif",
  size: 12,
  weight: "bold",
});

class LightDarkColorProperty extends DerivedProperty1<Color, boolean> {
  public constructor(
    public readonly lightColor: TColor,
    public readonly darkColor: TColor,
  ) {
    super([isOSDarkModeProperty], (isDark) => {
      return PaintDef.toColor(isDark ? darkColor : lightColor);
    });
  }
}

export const backgroundColorProperty = new LightDarkColorProperty(
  "#eee",
  "#333",
);
export const uiForegroundColorProperty = new LightDarkColorProperty(
  "#000",
  "rgb(204,204,204)",
);
