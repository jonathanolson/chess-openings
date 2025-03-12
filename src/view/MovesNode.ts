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
import { Move } from "../model/common.js";

export class MovesNode extends VBox {
  public constructor(model: Model) {
    super({
      align: "left",
      visibleProperty: model.isNotDrillProperty,
    });
    const updateMoveNode = () => {
      const stackMove = model.selectedStackMoveProperty.value;
      const fen = stackMove ? getFen(stackMove.board) : initialFen;
      const node = model.nodesProperty.value[fen];

      this.removeAllChildren();

      // TODO: determine perhaps storing summaries by... the type? We will want to change the type, no?
      let lichessSummary = stackMove?.lichessSummary ?? null;

      if (!lichessSummary) {
        const possibleSummary = getCompactLichessExplore(
          stackMove?.history ?? [],
          "blitzLow",
        );

        if (possibleSummary instanceof Promise) {
          possibleSummary.then((summary) => {
            if (stackMove) {
              stackMove.lichessSummary = summary;
              stackLichessUpdatedEmitter.emit();
            }
          });
        } else {
          lichessSummary = possibleSummary;
          if (stackMove) {
            stackMove.lichessSummary = lichessSummary;
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

          const bar = new WinStatisticsBar(
            lichessWins,
            model.isWhiteProperty.value,
            {
              layoutOptions: { column: 1, row: 0 },
            },
          );

          const gridBox = new GridBox({
            spacing: 10,
            children: [
              new Text(move, {
                font: isIncludedInTree ? boldFont : unboldFont,
                layoutOptions: {
                  column: 0,
                  row: 0,
                  minContentWidth: 55,
                  xAlign: "left",
                },
              }),
              bar,
              new Text(
                lichessWins
                  ? lichessWins.whiteWins +
                    lichessWins.blackWins +
                    lichessWins.draws
                  : "",
                {
                  font: unboldFont,
                  layoutOptions: {
                    column: 2,
                    row: 0,
                    minContentWidth: 60,
                    xAlign: "left",
                  },
                },
              ),
              new Text(
                moveNode ? moveNode.getCumulativePriority().toFixed(2) : "-",
                {
                  font: unboldFont,
                  layoutOptions: {
                    column: 3,
                    row: 0,
                    minContentWidth: 40,
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
    stackLichessUpdatedEmitter.addListener(updateMoveNode);
  }
}
