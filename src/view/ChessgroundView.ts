import { Chessground } from "chessground";
import { Chess, SQUARES } from "chess.js";
import { Move, Square, VerboseMove } from "../model/common";
import { getFen } from "../model/getFen.js";
import { Multilink } from "scenerystack/axon";
import { Nodes } from "../model/ChessNode.js";
import { Model } from "../model/Model.js";

export class ChessgroundView {
  public constructor(model: Model, boardDiv: HTMLDivElement) {
    const ground = Chessground(boardDiv, {
      coordinates: false,
      draggable: {
        showGhost: true,
      },
      animation: {
        enabled: false,
      },
    });

    const toColor = (board: Chess) =>
      board.turn() === "w" ? "white" : "black";

    // Orientation
    model.isWhiteProperty.link((isWhite) => {
      ground.set({
        orientation: isWhite ? "white" : "black",
      });
    });

    // Board properties
    model.boardProperty.link((board) => {
      const dests = new Map();
      SQUARES.forEach((s: Square) => {
        const ms = board.moves({ square: s, verbose: true });
        ms.length &&
          dests.set(
            s,
            ms.map((m: VerboseMove) => m.to),
          );
      });

      const history = board.history({ verbose: true });
      const lastMove = history.length ? history[history.length - 1] : null;

      ground.set({
        fen: getFen(board),
        check: board.inCheck(),
        turnColor: toColor(board),
        lastMove: lastMove ? [lastMove.from, lastMove.to] : [],
        movable: {
          free: false,
          color: toColor(board),
          dests: dests,
        },
      });
    });

    // Arrows
    Multilink.multilink(
      [
        model.nodesProperty,
        model.boardProperty,
        model.hoveredPotentialVerboseMoveProperty,
        model.isDrillProperty,
        model.drillFailedProperty,
      ],
      (
        nodes: Nodes,
        board: Chess,
        hoverVerboseMove: VerboseMove | null,
        isDrill: boolean,
        drillFailed: boolean,
      ) => {
        const fen = getFen(board);
        const node = nodes[fen];

        const moveToShape = (move: Move, color: string) => {
          const subboard = new Chess(fen);
          const verboseMove = subboard.move(move);
          return {
            orig: verboseMove.from,
            dest: verboseMove.to,
            brush: color,
          };
        };

        const shapes = node
          ? node.moves.map((move) => moveToShape(move, "mappedMoves"))
          : [];
        if (hoverVerboseMove) {
          shapes.push({
            orig: hoverVerboseMove.from,
            dest: hoverVerboseMove.to,
            brush: "potentialMoves",
          });
        }
        const drillFailedMoves = [];
        if (drillFailed) {
          drillFailedMoves.push(
            moveToShape(
              model.drillTargetStackProperty.value[
                model.stackProperty.value.length
              ].move,
              "failedMoves",
            ),
          );
        }
        ground.set({
          drawable: {
            enabled: false,
            visible: true,
            // @ts-expect-error I am not defining some brushes
            brushes: {
              mappedMoves: {
                key: "mappedMoves",
                color: "#15781B",
                opacity: 0.5,
                lineWidth: 10,
              },
              potentialMoves: {
                key: "potentialMoves",
                color: "#003088",
                opacity: 0.5,
                lineWidth: 10,
              },
              failedMoves: {
                key: "failedMoves",
                color: "#882020",
                opacity: 0.5,
                lineWidth: 10,
              },
            },
          },
        });
        ground.setShapes(isDrill ? drillFailedMoves : shapes);
      },
    );

    // Listen to chessground move events
    ground.set({
      movable: {
        events: {
          after: (from: Square | "a0", to: Square | "a0") => {
            const afterBoard = new Chess(getFen(model.boardProperty.value));
            afterBoard.move({ from: from, to: to });
            model.addMoveBoard(afterBoard);

            if (model.isDrillProperty.value) {
              model.lastDrillProperty.value =
                model.drillTargetStackProperty.value;
              model.drillCheck();
            }
          },
        },
      },
    });
  }
}
