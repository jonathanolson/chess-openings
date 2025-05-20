import { AlignBox, VBox, VBoxOptions } from "scenerystack/scenery";
import { Model, MoveRowSort } from "../model/Model.js";
import { stackLichessUpdatedEmitter } from "../model/StackMove.js";
import { getFen } from "../model/getFen.js";
import { Chess } from "chess.js";
import { LichessExploreWins } from "../model/getLichessExplore.js";
import { initialFen } from "../model/initialFen.js";
import { Fen, Move } from "../model/common.js";
import {
  StockfishEntry,
  stockfishEntryToWinPercentage,
} from "../model/StockfishData.js";
import { getExploreStatistics } from "../model/getExploreStatistics.js";
import {
  fenDataStockfishData,
  loadedFullFenData,
} from "../model/fenDataSource.js";
import { ExploreStatistics } from "../model/ExploreStatistics.js";
import _ from "lodash";
import { MoveRowNode } from "./MoveRowNode.js";
import { EmptySelfOptions, optionize } from "scenerystack/phet-core";
import { MoveHeaderRowNode } from "./MoveHeaderRowNode.js";
import { MOVE_ROW_DILATION_X } from "./MoveRowConstants.js";

type SelfOptions = EmptySelfOptions;

export type MovesNodeOptions = VBoxOptions & SelfOptions;

export class MovesNode extends VBox {
  private readonly moveRowNodes: MoveRowNode[] = [];

  public constructor(model: Model, providedOptions?: MovesNodeOptions) {
    const options = optionize<MovesNodeOptions, SelfOptions, VBoxOptions>()(
      {
        align: "left",
        visibleProperty: model.isNotDrillProperty,
      },
      providedOptions,
    );

    super(options);

    const moveHeaderRowNode = new MoveHeaderRowNode(model);
    const insetHeaderRow = new AlignBox(moveHeaderRowNode, {
      leftMargin: MOVE_ROW_DILATION_X,
    });

    const updateMoveNode = () => {
      const stackMove = model.selectedStackMoveProperty.value;
      const fen: Fen = stackMove ? getFen(stackMove.board) : initialFen;
      const node = model.nodesProperty.value[fen];

      this.removeAllChildren();

      // Don't set things up if we are in a drill
      if (!model.isNotDrillProperty.value) {
        return;
      }

      const lichessType = model.lichessExploreTypeProperty.value;

      let exploreStatistics =
        stackMove?.exploreStatisticsMap?.get(lichessType) ?? null;

      const statisticsPotentiallyOutOfDate =
        !!exploreStatistics &&
        loadedFullFenData &&
        !exploreStatistics.hasTranspositions;

      // If we don't have it (OR if we have since loaded full data)
      if (!exploreStatistics || statisticsPotentiallyOutOfDate) {
        const possibleExploreStatistics = getExploreStatistics(
          stackMove?.history ?? [],
          lichessType,
          !statisticsPotentiallyOutOfDate, // if we are potentially out-of-date, DO NOT force a lichess lookup
        );

        if (possibleExploreStatistics instanceof ExploreStatistics) {
          exploreStatistics = possibleExploreStatistics;
          if (stackMove) {
            stackMove.exploreStatisticsMap.set(lichessType, exploreStatistics);
          }
        } else if (possibleExploreStatistics instanceof Promise) {
          possibleExploreStatistics.then((statistics) => {
            if (stackMove) {
              stackMove.exploreStatisticsMap.set(lichessType, statistics);
              stackLichessUpdatedEmitter.emit();
            }
          });
        } else {
          // nothing, we should already have the explore statistics
        }
      }

      const moves: Move[] = stackMove?.board.moves() ?? new Chess().moves();

      const lichessSummary = exploreStatistics?.summary ?? null;

      if (moves.length === 0) {
        this.children = [];
        return;
      }

      const lichessTotal = lichessSummary
        ? _.sum(
            moves.map((move) => {
              const lichessWins = lichessSummary[move];
              return lichessWins
                ? lichessWins.whiteWins +
                    lichessWins.blackWins +
                    lichessWins.draws
                : 0;
            }),
          )
        : 0;

      this.children = [
        insetHeaderRow,
        ...moves
          .map((move, i) => {
            const lichessWins: LichessExploreWins | null =
              lichessSummary?.[move] ?? null;

            const isIncludedInTree = !!(node && node.moves.includes(move));
            const moveNode = isIncludedInTree ? node.getChildNode(move) : null;

            const moveBoard = new Chess(fen);
            moveBoard.move(move);
            const moveFen = getFen(moveBoard);
            const stockfishEntry: StockfishEntry | null =
              fenDataStockfishData[moveFen] ?? null;

            const reversePercentIfBlack = (percent: number) =>
              model.isWhiteProperty.value ? percent : 100 - percent;

            const stockfishIsWhite = moveBoard.turn() === "w";
            const stockfishWinPercentage: number | null = stockfishEntry
              ? reversePercentIfBlack(
                  stockfishEntryToWinPercentage(
                    stockfishEntry,
                    stockfishIsWhite,
                  ),
                )
              : null;

            let moveRowNode: MoveRowNode;
            if (this.moveRowNodes.length > i) {
              moveRowNode = this.moveRowNodes[i];
              moveRowNode.update(
                move,
                moveFen,
                moveNode,
                model.isWhiteProperty.value,
                stockfishIsWhite,
                lichessWins,
                lichessTotal,
                stockfishWinPercentage,
                isIncludedInTree,
              );
            } else {
              moveRowNode = new MoveRowNode(
                model,
                move,
                moveFen,
                moveNode,
                model.isWhiteProperty.value,
                stockfishIsWhite,
                lichessWins,
                lichessTotal,
                stockfishWinPercentage,
                isIncludedInTree,
              );
              this.moveRowNodes.push(moveRowNode);
            }
            return moveRowNode;
          })
          .sort((a, b) => {
            const sort = model.moveRowSortProperty.value;
            const includedFirst = model.moveRowSortIncludedFirstProperty.value;

            if (includedFirst && a.isIncludedInTree !== b.isIncludedInTree) {
              return a.isIncludedInTree ? -1 : 1;
            }

            const aWhiteWins = a.lichessWins?.whiteWins ?? 0;
            const aDraws = a.lichessWins?.draws ?? 0;
            const aBlackWins = a.lichessWins?.blackWins ?? 0;
            const aTotal = aWhiteWins + aDraws + aBlackWins;
            const aWins = model.isWhiteProperty.value ? aWhiteWins : aBlackWins;

            const bWhiteWins = b.lichessWins?.whiteWins ?? 0;
            const bDraws = b.lichessWins?.draws ?? 0;
            const bBlackWins = b.lichessWins?.blackWins ?? 0;
            const bTotal = bWhiteWins + bDraws + bBlackWins;
            const bWins = model.isWhiteProperty.value ? bWhiteWins : bBlackWins;

            if (sort === MoveRowSort.MOVE) {
              return a.move.localeCompare(b.move);
            } else if (sort === MoveRowSort.SUBTREE) {
              if (a.subtreePriority !== b.subtreePriority) {
                if (a.subtreePriority === null) {
                  return 1;
                }
                if (b.subtreePriority === null) {
                  return -1;
                }
                return b.subtreePriority - a.subtreePriority;
              }
            } else if (
              sort === MoveRowSort.WIN_STATISTICS ||
              sort === MoveRowSort.WIN_DRAW_STATISTICS
            ) {
              if (aTotal > 0 || bTotal > 0) {
                if (aTotal === 0) {
                  return 1;
                }
                if (bTotal === 0) {
                  return -1;
                }

                const aVal =
                  (sort === MoveRowSort.WIN_STATISTICS
                    ? aWins
                    : aWins + aDraws) / aTotal;
                const bVal =
                  (sort === MoveRowSort.WIN_STATISTICS
                    ? bWins
                    : bWins + bDraws) / bTotal;

                return bVal - aVal;
              }
            } else if (sort === MoveRowSort.STOCKFISH_EVAL) {
              const aVal = a.stockfishEntry
                ? stockfishEntryToWinPercentage(
                    a.stockfishEntry,
                    a.isNextTurnWhite,
                  )
                : null;
              const bVal = b.stockfishEntry
                ? stockfishEntryToWinPercentage(
                    b.stockfishEntry,
                    b.isNextTurnWhite,
                  )
                : null;

              if (aVal !== null || bVal !== null) {
                if (aVal === null) {
                  return 1;
                }
                if (bVal === null) {
                  return -1;
                }

                return model.isWhiteProperty.value ? bVal - aVal : aVal - bVal;
              }
            } else if (sort === MoveRowSort.PRIORITY) {
              const aVal =
                a.moveNode && a.moveNode.isWhiteTurn() === a.isWhite
                  ? a.moveNode.priority
                  : null;
              const bVal =
                b.moveNode && b.moveNode.isWhiteTurn() === b.isWhite
                  ? b.moveNode.priority
                  : null;

              if (aVal !== null || bVal !== null) {
                if (aVal === null) {
                  return 1;
                }
                if (bVal === null) {
                  return -1;
                }

                return bVal - aVal;
              }
            }

            // backup sort! (and just... popularity statistics in general)
            return bTotal - aTotal;
          })
          .map((moveRowNode, i) => {
            moveRowNode.isEvenProperty.value = i % 2 === 0;

            return moveRowNode;
          }),
      ];
    };

    model.selectedStackMoveProperty.link(updateMoveNode);
    model.moveRowSortProperty.lazyLink(updateMoveNode);
    model.moveRowSortIncludedFirstProperty.lazyLink(updateMoveNode);
    model.isWhiteProperty.lazyLink(updateMoveNode);
    model.nodesProperty.lazyLink(updateMoveNode);
    model.lichessExploreTypeProperty.lazyLink(updateMoveNode);
    model.isNotDrillProperty.lazyLink(updateMoveNode); // since we don't update when this is not true
    stackLichessUpdatedEmitter.addListener(updateMoveNode);
  }
}
