import { DerivedProperty, NumberProperty } from "scenerystack/axon";

export const MOVE_ROW_MOVE_TEXT_WIDTH = 35;
export const MOVE_ROW_SUBTREE_WEIGHT_WIDTH = 25;
export const MOVE_ROW_STOCKFISH_EVAL_WIDTH = 45;
export const MOVE_ROW_PRIORITY_WIDTH = 45;
export const MOVE_ROW_POPULARITY_WIDTH = 100;
export const MOVE_ROW_SPACING = 3;
export const MOVE_ROW_DILATION_X = 5;
export const MOVE_ROW_DILATION_Y = 2;

export const moveRowWinStatisticsBarInternalWidthProperty = new NumberProperty(
  150,
);
export const moveRowWinStatisticsBarWidthProperty = new DerivedProperty(
  [moveRowWinStatisticsBarInternalWidthProperty],
  (width) => width + 1,
);
