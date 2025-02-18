import { converter, formatHex, parse } from "culori";
import { Font } from "scenerystack/scenery";
import { Vector2 } from "scenerystack/dot";

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
