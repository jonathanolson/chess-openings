import { converter, formatHex, parse } from "culori";
import { Color, Font, PaintDef, TColor } from "scenerystack/scenery";
import { Vector2 } from "scenerystack/dot";
import { BooleanProperty, DerivedProperty2 } from "scenerystack/axon";
import { isOSDarkModeProperty } from "scenery-toolkit";

const nicePurpleK = converter("oklab")(parse("#c87adb"))!;
const nicePurpleHueChroma = new Vector2(nicePurpleK.a, nicePurpleK.b);
const niceRedHueChroma = nicePurpleHueChroma.rotated(1);
const niceRedK = {
  mode: "oklab",
  l: nicePurpleK.l,
  a: niceRedHueChroma.x,
  b: niceRedHueChroma.y,
};
const darkerLuminance = 0.45;
const niceDarkPurpleK = {
  mode: "oklab",
  l: darkerLuminance,
  a: nicePurpleHueChroma.x,
  b: nicePurpleHueChroma.y,
};
const niceDarkRedK = {
  mode: "oklab",
  l: darkerLuminance,
  a: niceRedHueChroma.x,
  b: niceRedHueChroma.y,
};

export const nicePurple = formatHex(nicePurpleK);
// @ts-expect-error Somethings seems wrong with type desc
export const niceRed = formatHex(niceRedK);
// @ts-expect-error Somethings seems wrong with type desc
export const niceDarkPurple = formatHex(niceDarkPurpleK);
// @ts-expect-error Somethings seems wrong with type desc
export const niceDarkRed = formatHex(niceDarkRedK);

export const unboldFont = new Font({
  family: "Helvetica, Arial, sans-serif",
  size: 12,
});
export const boldFont = new Font({
  family: "Helvetica, Arial, sans-serif",
  size: 12,
  weight: "bold",
});

export const reverseColorsProperty = new BooleanProperty(false);

class LightDarkColorProperty extends DerivedProperty2<Color, boolean, boolean> {
  public constructor(
    public readonly lightColor: TColor,
    public readonly darkColor: TColor,
  ) {
    super(
      [isOSDarkModeProperty, reverseColorsProperty],
      (isDark, reverseColors) => {
        return PaintDef.toColor(
          isDark !== reverseColors ? darkColor : lightColor,
        );
      },
    );
  }
}

export const backgroundColorProperty = new LightDarkColorProperty(
  "#eee",
  "#333",
);
export const strongBackgroundColorProperty = new LightDarkColorProperty(
  "#fff",
  "#111",
);
export const uiForegroundColorProperty = new LightDarkColorProperty(
  "#000",
  "rgb(204,204,204)",
);

export const stackNodeBorderProperty = new LightDarkColorProperty(
  "#666",
  "#999",
);
export const stackNodeLabelColorProperty = new LightDarkColorProperty(
  "#888",
  "#888",
);
export const stackNodeForegroundProperty = new LightDarkColorProperty(
  "#000",
  "#fff",
);
export const stackNodeBackgroundProperty = new LightDarkColorProperty(
  "#eee",
  "#000",
);
export const stackNodeTailInNodesColorProperty = new LightDarkColorProperty(
  nicePurple,
  niceDarkPurple,
);
export const stackNodeTailNotInNodesColorProperty = new LightDarkColorProperty(
  niceRed,
  niceDarkRed,
);
export const stackNodeHoverColorProperty = new LightDarkColorProperty(
  "#ccc",
  "#666",
);
export const stackNodeInNodesColorProperty = new LightDarkColorProperty(
  "#ddd",
  "#444",
);
export const stackNodeNotInNodesColorProperty = new LightDarkColorProperty(
  "#eee",
  "#222",
);

export const moveNodePopularityBarColorProperty = new LightDarkColorProperty(
  "#000",
  "rgb(204,204,204)",
);
export const moveNodePopularityCountColorProperty = new LightDarkColorProperty(
  "#ccc",
  "#333",
);

export const moveNodeIncludedHoverColorProperty = new LightDarkColorProperty(
  "#4af",
  "#2b6fae",
);
export const moveNodeIncludedEvenColorProperty = new LightDarkColorProperty(
  "#9cf",
  "#1f4c75",
);
export const moveNodeIncludedOddColorProperty = new LightDarkColorProperty(
  "#bdf",
  "#183956",
);

export const moveNodeUnincludedHoverColorProperty = new LightDarkColorProperty(
  "#ccc",
  "#333",
);
export const moveNodeUnincludedEvenColorProperty = new LightDarkColorProperty(
  "#ddd",
  "#222",
);
export const moveNodeUnincludedOddColorProperty = new LightDarkColorProperty(
  "#eee",
  "#111",
);
