import { AlignBox, HBox, Text } from "scenerystack/scenery";
import { ChessNode } from "../model/ChessNode";
import { LichessExploreWins } from "../model/getLichessExplore.js";
import { WinStatisticsBar } from "./WinStatisticsBar.js";
import { PopularityStatisticsBar } from "./PopularityStatisticsBar.js";
import { boldFont, uiForegroundColorProperty, unboldFont } from "./theme.js";
import { Fen } from "../model/common.js";
import {
  StockfishEntry,
  stockfishEntryToString,
} from "../model/StockfishData.js";
import { fenDataStockfishData } from "../model/fenDataSource.js";
import { Bounds2 } from "scenerystack/dot";
import {
  MOVE_ROW_MOVE_TEXT_WIDTH,
  MOVE_ROW_PRIORITY_WIDTH,
  MOVE_ROW_SPACING,
  MOVE_ROW_STOCKFISH_EVAL_WIDTH,
  MOVE_ROW_SUBTREE_WEIGHT_WIDTH,
} from "./MoveRowConstants.js";

export class MoveRowNode extends HBox {
  public readonly moveText: Text;
  public readonly subtreeWeightText: Text;
  public readonly stockfishEvalText: Text;
  public readonly priorityText: Text;
  public readonly winStatisticsBar: WinStatisticsBar;
  public readonly popularityStatisticsBar: PopularityStatisticsBar;

  public constructor(
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
      spacing: MOVE_ROW_SPACING,
    });

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

    this.subtreeWeightText = new Text(
      moveNode ? moveNode.getSubtreePriority(isWhite).toFixed(1) : "",
      {
        fill: uiForegroundColorProperty,
        font: unboldFont,
        maxWidth: MOVE_ROW_SUBTREE_WEIGHT_WIDTH,
      },
    );

    const stockfishEntry: StockfishEntry | null =
      fenDataStockfishData[fen] ?? null;
    this.stockfishEvalText = new Text(
      stockfishEntry
        ? stockfishEntryToString(stockfishEntry, isNextTurnWhite)
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

    this.children = [
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
    ];
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

    this.subtreeWeightText.string = moveNode
      ? moveNode.getSubtreePriority(isWhite).toFixed(1)
      : "-";

    const stockfishEntry: StockfishEntry | null =
      fenDataStockfishData[fen] ?? null;
    this.stockfishEvalText.string = stockfishEntry
      ? stockfishEntryToString(stockfishEntry, isNextTurnWhite)
      : "-";

    this.priorityText.string =
      moveNode && moveNode.isWhiteTurn() === isWhite
        ? moveNode.priority.toFixed(2)
        : "-";
  }
}
