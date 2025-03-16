import {
  FireListener,
  GridBox,
  Node,
  Rectangle,
  Text,
  VBox,
} from "scenerystack/scenery";
import { Model } from "../model/Model.js";
import { stackLichessUpdatedEmitter } from "../model/StackMove.js";
import { DerivedProperty } from "scenerystack/axon";
import { getFen } from "../model/getFen.js";
import { Chess } from "chess.js";
import { boldFont, unboldFont } from "./theme.js";
import { WinStatisticsBar } from "./WinStatisticsBar.js";
import {
  getCompactLichessExplore,
  LichessExploreWins,
} from "../model/getLichessExplore.js";
import { initialFen } from "../model/initialFen.js";
import { Fen, Move } from "../model/common.js";
import stockfishJSON from "../data/stockfish-snapshot.json";
import {
  StockfishData,
  StockfishEntry,
  stockfishEntryToString,
  stockfishEntryToWinPercentage,
} from "../model/StockfishData.js";

export class MovesNode extends VBox {
  public constructor(model: Model) {
    super({
      align: "left",
      visibleProperty: model.isNotDrillProperty,
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

      // TODO: determine perhaps storing summaries by... the type? We will want to change the type, no?
      let lichessSummary =
        stackMove?.lichessSummaryMap?.get(lichessType) ?? null;

      if (!lichessSummary) {
        const possibleSummary = getCompactLichessExplore(
          stackMove?.history ?? [],
          model.lichessExploreTypeProperty.value,
        );

        if (possibleSummary instanceof Promise) {
          possibleSummary.then((summary) => {
            if (stackMove) {
              stackMove.lichessSummaryMap.set(lichessType, summary);
              stackLichessUpdatedEmitter.emit();
            }
          });
        } else {
          lichessSummary = possibleSummary;
          if (stackMove) {
            stackMove.lichessSummaryMap.set(lichessType, lichessSummary);
          }
        }
      }

      const allMoves = stackMove?.board.moves() ?? new Chess().moves();

      const moves: Move[] = [];

      // in both (lichess order)
      if (lichessSummary && node) {
        moves.push(
          ...Object.keys(lichessSummary).filter((move) =>
            node.moves.includes(move),
          ),
        );
      }

      // in our moves only (our order)
      if (node) {
        moves.push(...node.moves.filter((move) => !moves.includes(move)));
      }

      // in lichess only (lichess order)
      if (lichessSummary) {
        moves.push(
          ...Object.keys(lichessSummary).filter(
            (move) => !moves.includes(move),
          ),
        );
      }

      // remaining moves
      moves.push(...allMoves.filter((move) => !moves.includes(move)));

      if (moves.length === 0) {
        this.children = [];
        return;
      }

      this.children = this.children.concat(
        moves.map((move, i) => {
          const lichessWins: LichessExploreWins | null =
            lichessSummary?.[move] ?? null;

          const isIncludedInTree = node && node.moves.includes(move);
          const moveNode = isIncludedInTree ? node.getChildNode(move) : null;

          const moveBoard = new Chess(fen);
          moveBoard.move(move);
          const moveFen = getFen(moveBoard);
          const stockfishEntry: StockfishEntry | null =
            (stockfishJSON as StockfishData)[moveFen] ?? null;

          const reversePercentIfBlack = (percent: number) =>
            model.isWhiteProperty.value ? percent : 100 - percent;

          const stockfishIsWhite = moveBoard.turn() === "w";
          const stockfishWinPercentage: number | null = stockfishEntry
            ? reversePercentIfBlack(
                stockfishEntryToWinPercentage(stockfishEntry, stockfishIsWhite),
              )
            : null;

          const bar = new WinStatisticsBar(
            lichessWins,
            model.isWhiteProperty.value,
            stockfishWinPercentage,
            {
              layoutOptions: { column: 2, row: 0 },
            },
          );

          // TODO: gridbox everything together
          const gridBox = new GridBox({
            spacing: 10,
            children: [
              new Text(move, {
                font: isIncludedInTree ? boldFont : unboldFont,
                layoutOptions: {
                  column: 0,
                  row: 0,
                  minContentWidth: 45,
                  xAlign: "left",
                },
              }),
              new Text(
                moveNode ? moveNode.getCumulativePriority().toFixed(2) : "-",
                {
                  font: unboldFont,
                  layoutOptions: {
                    column: 1,
                    row: 0,
                    minContentWidth: 45,
                    xAlign: "left",
                  },
                },
              ),
              bar,
              new Text(
                stockfishEntry
                  ? stockfishEntryToString(stockfishEntry, stockfishIsWhite)
                  : "-",
                {
                  font: unboldFont,
                  layoutOptions: {
                    column: 3,
                    row: 0,
                    minContentWidth: 40,
                    xAlign: "center",
                  },
                },
              ),
              new Text(
                lichessWins
                  ? lichessWins.whiteWins +
                    lichessWins.blackWins +
                    lichessWins.draws
                  : "",
                {
                  font: unboldFont,
                  layoutOptions: {
                    column: 4,
                    row: 0,
                    minContentWidth: 60,
                    xAlign: "left",
                  },
                },
              ),
            ],
          });

          // TODO: handle hover to show these options easily
          const fireListener = new FireListener({
            fire: () => {
              const afterBoard = new Chess(getFen(model.boardProperty.value));
              afterBoard.move(move);
              model.addMoveBoard(afterBoard);
            },
          });

          fireListener.looksOverProperty.lazyLink((looksOver) => {
            if (looksOver) {
              model.hoveredPotentialVerboseMoveProperty.value = new Chess(
                getFen(model.boardProperty.value),
              ).move(move);
            } else {
              model.hoveredPotentialVerboseMoveProperty.value = null;
            }
          });

          const backgroundProperty = new DerivedProperty(
            [fireListener.looksOverProperty],
            (looksOver) => {
              const isEven = i % 2 === 0;

              if (isIncludedInTree) {
                return looksOver ? "#4af" : isEven ? "#9cf" : "#bdf";
              } else {
                return looksOver ? "#ccc" : isEven ? "#ddd" : "#eee";
              }
            },
          );

          return new Node({
            cursor: "pointer",
            inputListeners: [fireListener],
            children: [
              Rectangle.bounds(gridBox.bounds.dilatedXY(5, 2), {
                fill: backgroundProperty,
              }),
              gridBox,
            ],
          });
        }),
      );
    };

    model.selectedStackMoveProperty.link(updateMoveNode);
    model.isWhiteProperty.lazyLink(updateMoveNode);
    model.nodesProperty.lazyLink(updateMoveNode);
    model.lichessExploreTypeProperty.lazyLink(updateMoveNode);
    model.isNotDrillProperty.lazyLink(updateMoveNode); // since we don't update when this is not true
    stackLichessUpdatedEmitter.addListener(updateMoveNode);
  }
}
