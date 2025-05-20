import {
  AlignBox,
  FireListener,
  HBox,
  Node,
  Rectangle,
  Text,
} from "scenerystack/scenery";
import { ChessNode } from "../model/ChessNode";
import { LichessExploreWins } from "../model/getLichessExplore.js";
import { WinStatisticsBar } from "./WinStatisticsBar.js";
import { PopularityStatisticsBar } from "./PopularityStatisticsBar.js";
import {
  boldFont,
  moveNodeIncludedEvenColorProperty,
  moveNodeIncludedHoverColorProperty,
  moveNodeIncludedOddColorProperty,
  moveNodeUnincludedEvenColorProperty,
  moveNodeUnincludedHoverColorProperty,
  moveNodeUnincludedOddColorProperty,
  uiForegroundColorProperty,
  unboldFont,
} from "./theme.js";
import { Fen } from "../model/common.js";
import {
  StockfishEntry,
  stockfishEntryToString,
} from "../model/StockfishData.js";
import { fenDataStockfishData } from "../model/fenDataSource.js";
import { Bounds2 } from "scenerystack/dot";
import {
  MOVE_ROW_DILATION_X,
  MOVE_ROW_DILATION_Y,
  MOVE_ROW_MOVE_TEXT_WIDTH,
  MOVE_ROW_PRIORITY_WIDTH,
  MOVE_ROW_SPACING,
  MOVE_ROW_STOCKFISH_EVAL_WIDTH,
  MOVE_ROW_SUBTREE_WEIGHT_WIDTH,
} from "./MoveRowConstants.js";
import { Model } from "../model/Model.js";
import { Chess } from "chess.js";
import { getFen } from "../model/getFen.js";
import { BooleanProperty, DerivedProperty } from "scenerystack/axon";

export class MoveRowNode extends Node {
  public readonly moveText: Text;
  public readonly subtreeWeightText: Text;
  public readonly stockfishEvalText: Text;
  public readonly priorityText: Text;
  public readonly winStatisticsBar: WinStatisticsBar;
  public readonly popularityStatisticsBar: PopularityStatisticsBar;
  public readonly isIncludedInTreeProperty: BooleanProperty =
    new BooleanProperty(false);

  public readonly isEvenProperty = new BooleanProperty(false);
  public subtreePriority: number | null;
  public stockfishEntry: StockfishEntry | null;

  public constructor(
    public readonly model: Model,
    public move: string,
    public fen: Fen,
    public moveNode: ChessNode | null,
    public isWhite: boolean,
    public isNextTurnWhite: boolean,
    public lichessWins: LichessExploreWins | null,
    public lichessTotal: number,
    public stockfishWinPercentage: number | null,
    public isIncludedInTree: boolean,
  ) {
    super({
      cursor: "pointer",
    });

    this.isIncludedInTreeProperty.value = isIncludedInTree;

    this.winStatisticsBar = new WinStatisticsBar(
      lichessWins,
      isWhite,
      stockfishWinPercentage,
    );
    this.popularityStatisticsBar = new PopularityStatisticsBar(
      lichessWins
        ? lichessWins.whiteWins + lichessWins.blackWins + lichessWins.draws
        : 0,
      lichessTotal,
    );

    this.moveText = new Text(move, {
      fill: uiForegroundColorProperty,
      font: isIncludedInTree ? boldFont : unboldFont,
      maxWidth: MOVE_ROW_MOVE_TEXT_WIDTH,
    });

    this.subtreePriority = moveNode
      ? moveNode.getSubtreePriority(isWhite)
      : null;
    this.subtreeWeightText = new Text(
      this.subtreePriority !== null ? this.subtreePriority.toFixed(1) : "",
      {
        fill: uiForegroundColorProperty,
        font: unboldFont,
        maxWidth: MOVE_ROW_SUBTREE_WEIGHT_WIDTH,
      },
    );

    this.stockfishEntry = fenDataStockfishData[fen] ?? null;
    this.stockfishEvalText = new Text(
      this.stockfishEntry
        ? stockfishEntryToString(this.stockfishEntry, isNextTurnWhite)
        : "-",
      {
        fill: uiForegroundColorProperty,
        font: unboldFont,
        maxWidth: MOVE_ROW_STOCKFISH_EVAL_WIDTH,
      },
    );

    this.priorityText = new Text(
      moveNode && moveNode.isWhiteTurn() === isWhite
        ? moveNode.priority.toFixed(2)
        : "-",
      {
        fill: uiForegroundColorProperty,
        font: unboldFont,
        maxWidth: MOVE_ROW_PRIORITY_WIDTH,
      },
    );

    const hbox = new HBox({
      spacing: MOVE_ROW_SPACING,
      children: [
        new AlignBox(this.moveText, {
          xAlign: "left",
          alignBounds: new Bounds2(
            0,
            0,
            MOVE_ROW_MOVE_TEXT_WIDTH,
            this.moveText.height,
          ),
        }),
        new AlignBox(this.subtreeWeightText, {
          xAlign: "right",
          alignBounds: new Bounds2(
            0,
            0,
            MOVE_ROW_SUBTREE_WEIGHT_WIDTH,
            this.subtreeWeightText.height,
          ),
        }),
        this.winStatisticsBar,
        new AlignBox(this.stockfishEvalText, {
          xAlign: "center",
          alignBounds: new Bounds2(
            0,
            0,
            MOVE_ROW_STOCKFISH_EVAL_WIDTH,
            this.stockfishEvalText.height,
          ),
        }),
        this.popularityStatisticsBar,
        new AlignBox(this.priorityText, {
          xAlign: "right",
          alignBounds: new Bounds2(
            0,
            0,
            MOVE_ROW_PRIORITY_WIDTH,
            this.priorityText.height,
          ),
        }),
      ],
    });

    // TODO: handle hover to show these options easily
    const fireListener = new FireListener({
      fire: () => {
        const afterBoard = new Chess(getFen(model.boardProperty.value));
        afterBoard.move(this.move);
        model.addMoveBoard(afterBoard);
      },
    });

    fireListener.looksOverProperty.lazyLink((looksOver) => {
      if (looksOver) {
        model.hoveredPotentialVerboseMoveProperty.value = new Chess(
          getFen(model.boardProperty.value),
        ).move(this.move);
      } else {
        model.hoveredPotentialVerboseMoveProperty.value = null;
      }
    });

    this.addInputListener(fireListener);

    // TODO: don't leak memory (pool MoveRowNodes)
    const backgroundProperty = new DerivedProperty(
      [
        fireListener.looksOverProperty,
        moveNodeIncludedHoverColorProperty,
        moveNodeIncludedEvenColorProperty,
        moveNodeIncludedOddColorProperty,
        moveNodeUnincludedHoverColorProperty,
        moveNodeUnincludedEvenColorProperty,
        moveNodeUnincludedOddColorProperty,
        this.isEvenProperty,
        this.isIncludedInTreeProperty,
      ],
      (
        looksOver,
        includedHoverColor,
        includedEvenColor,
        includedOddColor,
        unincludedHoverColor,
        unincludedEvenColor,
        unincludedOddColor,
        isEven,
        isIncludedInTree,
      ) => {
        if (isIncludedInTree) {
          return looksOver
            ? includedHoverColor
            : isEven
              ? includedEvenColor
              : includedOddColor;
        } else {
          return looksOver
            ? unincludedHoverColor
            : isEven
              ? unincludedEvenColor
              : unincludedOddColor;
        }
      },
    );

    const highlightBackground = new Rectangle({
      fill: backgroundProperty,
    });
    hbox.boundsProperty.link((bounds) => {
      highlightBackground.rectBounds = bounds.dilatedXY(
        MOVE_ROW_DILATION_X,
        MOVE_ROW_DILATION_Y,
      );
    });

    this.children = [highlightBackground, hbox];
  }

  public update(
    move: string,
    fen: Fen,
    moveNode: ChessNode | null,
    isWhite: boolean,
    isNextTurnWhite: boolean,
    lichessWins: LichessExploreWins | null,
    lichessTotal: number,
    stockfishWinPercentage: number | null,
    isIncludedInTree: boolean,
  ): void {
    this.move = move;
    this.fen = fen;
    this.moveNode = moveNode;
    this.isWhite = isWhite;
    this.isNextTurnWhite = isNextTurnWhite;
    this.lichessWins = lichessWins;
    this.lichessTotal = lichessTotal;
    this.stockfishWinPercentage = stockfishWinPercentage;
    this.isIncludedInTree = isIncludedInTree;
    this.isIncludedInTreeProperty.value = isIncludedInTree;

    this.winStatisticsBar.setData(lichessWins, isWhite, stockfishWinPercentage);
    this.popularityStatisticsBar.setData(
      lichessWins
        ? lichessWins.whiteWins + lichessWins.blackWins + lichessWins.draws
        : 0,
      lichessTotal,
    );

    // TODO: reduce duplication
    this.moveText.string = move;
    this.moveText.font = isIncludedInTree ? boldFont : unboldFont;

    this.subtreePriority = moveNode
      ? moveNode.getSubtreePriority(isWhite)
      : null;
    this.subtreeWeightText.string =
      this.subtreePriority !== null ? this.subtreePriority.toFixed(1) : "-";

    this.stockfishEntry = fenDataStockfishData[fen] ?? null;
    this.stockfishEvalText.string = this.stockfishEntry
      ? stockfishEntryToString(this.stockfishEntry, isNextTurnWhite)
      : "-";

    this.priorityText.string =
      moveNode && moveNode.isWhiteTurn() === isWhite
        ? moveNode.priority.toFixed(2)
        : "-";
  }
}
