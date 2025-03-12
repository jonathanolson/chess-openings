import { QueryStringMachine } from "scenerystack/query-string-machine";
import { enableAssert } from "scenerystack/assert";
import {
  DerivedProperty,
  Multilink,
  Property,
  stepTimer,
} from "scenerystack/axon";
import { Bounds2 } from "scenerystack/dot";
import {
  Color,
  Display,
  FireListener,
  GridBox,
  HBox,
  Node,
  Path,
  Rectangle,
  Text,
  VBox,
} from "scenerystack/scenery";
import { Chess, SQUARES } from "chess.js";
import { Chessground } from "chessground";
import {
  AquaRadioButtonGroup,
  BooleanRectangularStickyToggleButton,
  ButtonNode,
  RectangularPushButton,
} from "scenerystack/sun";
import { saveAs } from "file-saver";
import {
  backwardSolidShape,
  chartBarSolidShape,
  dumbbellSolidShape,
  eraserSolidShape,
  fileDownloadSolidShape,
  forwardSolidShape,
  lockSolidShape,
  runningSolidShape,
  saveSolidShape,
  signOutAltSolidShape,
  stepBackwardSolidShape,
  stepForwardSolidShape,
} from "scenery-fontawesome-5";
import chessOpenings from "./data/chessOpenings";
import { Move, SaveState, Square, VerboseMove } from "./model/common";
import { getFen } from "./model/getFen";
import { Nodes } from "./model/ChessNode";
import { initialFen } from "./model/initialFen";
import { stackLichessUpdatedEmitter, StackMove } from "./model/StackMove.js";
import { copyToClipboard } from "./view/copyToClipboard.js";
import { SignInNode } from "./view/SignInNode.js";
import {
  loadUserState,
  logOut,
  saveUserState,
  userLoadedPromise,
  userPromise,
  userProperty,
} from "./model/firebase-actions.js";
import {
  backgroundColorProperty,
  boldFont,
  uiForegroundColorProperty,
  unboldFont,
} from "./view/theme.js";
import { StackNode } from "./view/StackNode.js";
import { Model } from "./model/Model.js";
import { glassPane, TooltipListener, ViewContext } from "scenery-toolkit";
import { getOpeningInfo } from "./model/getOpeningInfo.js";
import {
  getCompactLichessExplore,
  LichessExploreWins,
} from "./model/getLichessExplore.js";
import { WinStatisticsBar } from "./view/WinStatisticsBar.js";
import { LastDrillNode } from "./view/LastDrillNode.js";

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
if (process.env.NODE_ENV === "development") {
  // Enable assertions if we are in development mode
  enableAssert();
}

// @ts-expect-error defining a global
window.Chess = Chess;

(async () => {
  const options = QueryStringMachine.getAll({
    local: {
      type: "flag",
      public: true,
    },
  });

  const topDiv = document.createElement("div");
  topDiv.classList.add("blue");
  topDiv.classList.add("is2d");
  topDiv.style.display = "flex";
  topDiv.style.justifyContent = "center";

  const boardDiv = document.createElement("div");
  boardDiv.id = "board";
  boardDiv.classList.add("cg-wrap");
  boardDiv.style.width = "360px";
  boardDiv.style.height = "360px";
  topDiv.appendChild(boardDiv);

  const mainDiv = document.createElement("div");
  mainDiv.id = "main-container";

  document.body.appendChild(topDiv);
  document.body.appendChild(mainDiv);

  backgroundColorProperty.link((color) => {
    document.body.style.backgroundColor = color.toCSS();
  });

  const mainContent = new Node();
  const scene = new Node({
    children: [mainContent, glassPane],
  });

  const onselectstart = document.onselectstart;
  const display = new Display(scene, {
    width: 512,
    height: 512,
    backgroundColor: Color.TRANSPARENT,
    passiveEvents: true,
  });
  document.onselectstart = onselectstart; // workaround for CSS hacks

  const mainContainer = document.getElementById("main-container")!;
  mainContainer.appendChild(display.domElement);
  display.domElement.style.position = "relative";
  display.domElement.style.marginTop = "20px";

  display.updateDisplay();
  display.initializeEvents();

  const layoutBoundsProperty = new Property(new Bounds2(0, 0, 0, 0));

  new ResizeObserver((entries) => {
    for (const entry of entries) {
      layoutBoundsProperty.value = layoutBoundsProperty.value.withMaxX(
        Math.ceil(entry.contentRect.width),
      );
    }
  }).observe(mainContainer);

  const viewContext = new ViewContext(
    layoutBoundsProperty,
    glassPane,
    stepTimer,
  );

  const genericTooltipListener = new TooltipListener(viewContext);

  // TODO: how to handle sign-in better
  display.updateOnRequestAnimationFrame(() => {
    if (scene.bounds.isValid()) {
      // TODO: figure out something long-term
      layoutBoundsProperty.value = layoutBoundsProperty.value.withMaxY(
        Math.ceil(scene.bottom) + 2,
      );
      display.setWidthHeight(
        layoutBoundsProperty.value.width,
        layoutBoundsProperty.value.height,
      );
    }
  });

  let usedOnlineChessOpenings = false;

  let usedChessOpenings: SaveState;
  if (options.local) {
    usedChessOpenings = chessOpenings;
  } else {
    try {
      await userLoadedPromise;
      console.log("user loaded!");
      console.log(`user ${userProperty.value ? userProperty.value.uid : null}`);

      if (!userProperty.value) {
        const signInNode = new SignInNode();

        const layoutListener = () => {
          signInNode.centerX = layoutBoundsProperty.value.width / 2;
        };
        layoutBoundsProperty.link(layoutListener);
        mainContent.addChild(signInNode);

        // TODO: resizability here

        // TODO: cleanup here
        await userPromise;

        mainContent.removeChild(signInNode);
        layoutBoundsProperty.unlink(layoutListener);

        console.log("got user");
      }

      usedChessOpenings = (await loadUserState<SaveState>(
        userProperty.value!.uid,
      ))!;

      // TODO: assert this out?

      usedOnlineChessOpenings = true;
    } catch (e) {
      console.error("load failure");
      console.error(e);
      usedChessOpenings = chessOpenings;
    }
  }

  const model = new Model(usedChessOpenings);

  const exportState = async () => {
    const obj = model.getCompactState();

    const json = JSON.stringify(obj);

    const string = "export default " + json + ";";

    console.log(string);

    // Do not wipe out progress online!!!
    if (options.local || !usedOnlineChessOpenings) {
      saveAs(
        new Blob([string], { type: "application/json;charset=utf-8" }),
        "chessOpenings.js",
      );
      downloadBaseColor.value = new Color("#aaf");
    } else {
      downloadBaseColor.value = Color.WHITE;

      try {
        await saveUserState(userProperty.value!.uid, obj);
        downloadBaseColor.value = new Color("#afa");
      } catch (e) {
        console.error("Failed to save!");
        console.error(e);
        downloadBaseColor.value = new Color("#faa");
      }
    }

    return json;
  };

  const showNodes = () => {};

  const toColor = (board: Chess) => (board.turn() === "w" ? "white" : "black");

  const ground = Chessground(boardDiv, {
    coordinates: false,
    draggable: {
      showGhost: true,
    },
    animation: {
      enabled: false,
    },
  });

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

  // Listen for the enter key press.
  document.body.addEventListener("keydown", (e) => {
    // console.log( e.keyCode );

    if (e.keyCode === 37 && canGoBackProperty.value) {
      model.goBack();
    }
    if (e.keyCode === 39 && canGoForwardProperty.value) {
      model.goForward();
    }
  });

  const stackContainer = new Node();
  Multilink.multilink(
    [model.stackProperty, model.stackPositionProperty, model.nodesProperty],
    (stack: StackMove[], stackPosition: number, nodes: Nodes) => {
      stackContainer.children = [
        new StackNode(
          stack,
          stackPosition,
          nodes,
          model.selectStackIndex.bind(model),
        ),
      ];
    },
  );

  const whiteBlackSwitch = new AquaRadioButtonGroup(
    model.isWhiteProperty,
    [
      {
        value: true,
        createNode: () =>
          new Text("White", { fill: uiForegroundColorProperty }),
      },
      {
        value: false,
        createNode: () =>
          new Text("Black", { fill: uiForegroundColorProperty }),
      },
    ],
    {
      orientation: "horizontal",
      spacing: 15,
      enabledProperty: model.isNotDrillProperty,
    },
  );

  const canGoBackProperty = new DerivedProperty(
    [model.stackPositionProperty],
    (stackPosition) => stackPosition >= 1,
  );
  const canGoForwardProperty = new DerivedProperty(
    [model.stackPositionProperty, model.stackProperty],
    (stackPosition: number, stack: StackMove[]) => stackPosition < stack.length,
  );

  const controlButtons = new HBox({
    spacing: 5,
    children: [
      new RectangularPushButton({
        content: new Path(backwardSolidShape, { fill: "black", scale: 0.03 }),
        accessibleName: "Go to Starting Position",
        listener: () => model.goFullBack(),
        baseColor: "#fff",
        enabledProperty: canGoBackProperty,
        buttonAppearanceStrategy: ButtonNode.FlatAppearanceStrategy,
      }),
      new RectangularPushButton({
        content: new Path(stepBackwardSolidShape, {
          fill: "black",
          scale: 0.03,
        }),
        accessibleName: "Go Back",
        listener: () => model.goBack(),
        baseColor: "#fff",
        enabledProperty: canGoBackProperty,
        buttonAppearanceStrategy: ButtonNode.FlatAppearanceStrategy,
      }),
      new RectangularPushButton({
        content: new Path(stepForwardSolidShape, {
          fill: "black",
          scale: 0.03,
        }),
        accessibleName: "Go Forward",
        listener: () => model.goForward(),
        baseColor: "#fff",
        enabledProperty: canGoForwardProperty,
        buttonAppearanceStrategy: ButtonNode.FlatAppearanceStrategy,
      }),
      new RectangularPushButton({
        content: new Path(forwardSolidShape, { fill: "black", scale: 0.03 }),
        accessibleName: "Go to End of Line",
        listener: () => model.goFullForward(),
        baseColor: "#fff",
        enabledProperty: canGoForwardProperty,
        buttonAppearanceStrategy: ButtonNode.FlatAppearanceStrategy,
      }),
    ],
  });
  controlButtons.children.forEach((button) =>
    button.addInputListener(genericTooltipListener),
  );

  const downloadBaseColor = new Property<Color>(Color.WHITE);

  const fileButtons = new HBox({
    spacing: 5,
    children: [
      new RectangularPushButton({
        content: new Path(fileDownloadSolidShape, {
          fill: "black",
          scale: 0.03,
        }),
        accessibleName: "Save Changes",
        listener: exportState,
        baseColor: downloadBaseColor,
        buttonAppearanceStrategy: ButtonNode.FlatAppearanceStrategy,
      }),
      new RectangularPushButton({
        content: new Path(saveSolidShape, { fill: "black", scale: 0.03 }),
        accessibleName: "Remember This Line",
        listener: () => model.saveTree(),
        baseColor: "#fff",
        enabledProperty: model.isNotDrillProperty,
        buttonAppearanceStrategy: ButtonNode.FlatAppearanceStrategy,
      }),
      new RectangularPushButton({
        content: new Path(eraserSolidShape, { fill: "black", scale: 0.03 }),
        accessibleName: "Forget This Line",
        listener: () => model.deleteTree(),
        baseColor: "#fff",
        enabledProperty: model.isNotDrillProperty,
        buttonAppearanceStrategy: ButtonNode.FlatAppearanceStrategy,
      }),
      new RectangularPushButton({
        content: new Path(signOutAltSolidShape, { fill: "black", scale: 0.03 }),
        accessibleName: "Log Out",
        listener: async () => {
          await logOut();

          // TODO: show sign in!
        },
        baseColor: "#fff",
        buttonAppearanceStrategy: ButtonNode.FlatAppearanceStrategy,
      }),
    ],
  });
  fileButtons.children.forEach((button) =>
    button.addInputListener(genericTooltipListener),
  );

  const drillButtons = new HBox({
    spacing: 5,
    children: [
      new RectangularPushButton({
        content: new Path(runningSolidShape, { fill: "black", scale: 0.03 }),
        accessibleName: "Toggle Drill Mode",
        listener: () => model.toggleDrills(),
        baseColor: "#fff",
        buttonAppearanceStrategy: ButtonNode.FlatAppearanceStrategy,
      }),
      new BooleanRectangularStickyToggleButton(model.useDrillWeightsProperty, {
        content: new Path(dumbbellSolidShape, { fill: "black", scale: 0.03 }),
        accessibleName: "Toggle Drill Weights",
        baseColor: "#fff",
        enabledProperty: model.isNotDrillProperty,
        buttonAppearanceStrategy: ButtonNode.FlatAppearanceStrategy,
      }),
      new BooleanRectangularStickyToggleButton(model.lockDrillToColorProperty, {
        content: new Path(lockSolidShape, { fill: "black", scale: 0.03 }),
        accessibleName: "Lock Single Color",
        baseColor: "#fff",
        enabledProperty: model.isNotDrillProperty,
        buttonAppearanceStrategy: ButtonNode.FlatAppearanceStrategy,
      }),
      new RectangularPushButton({
        content: new Path(chartBarSolidShape, { fill: "black", scale: 0.03 }),
        accessibleName: "Show Statistics",
        listener: () => showNodes(),
        baseColor: "#fff",
        enabledProperty: model.isNotDrillProperty,
        buttonAppearanceStrategy: ButtonNode.FlatAppearanceStrategy,
      }),
    ],
  });
  drillButtons.children.forEach((button) =>
    button.addInputListener(genericTooltipListener),
  );

  const fenText = new Text("", {
    fontSize: 8,
    fill: uiForegroundColorProperty,
    cursor: "pointer",
    inputListeners: [
      new FireListener({
        fire: () => copyToClipboard(getFen(model.boardProperty.value)),
      }),
    ],
  });
  model.boardProperty.link((board) => {
    fenText.string = getFen(board);
  });

  const selectedOpeningNameProperty = new Property("-");
  const openingNameText = new Text(selectedOpeningNameProperty, {
    font: boldFont,
    fill: uiForegroundColorProperty,
    visibleProperty: model.isNotDrillProperty,
  });

  const moveContainer = new VBox({
    align: "left",
    visibleProperty: model.isNotDrillProperty,
  });
  const updateMoveNode = () => {
    const stackMove = model.selectedStackMoveProperty.value;
    const fen = stackMove ? getFen(stackMove.board) : initialFen;
    const node = model.nodesProperty.value[fen];

    moveContainer.removeAllChildren();

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
        ...Object.keys(lichessSummary).filter((move) => !moves.includes(move)),
      );
    }

    // remaining moves
    moves.push(...allMoves.filter((move) => !moves.includes(move)));

    if (moves.length === 0) {
      moveContainer.children = [];
      return;
    }

    const openingInfo = stackMove ? getOpeningInfo(stackMove.history) : null;

    if (openingInfo) {
      selectedOpeningNameProperty.value = openingInfo.name;
    } else {
      selectedOpeningNameProperty.reset();
    }

    moveContainer.children = moveContainer.children.concat(
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

  const lastDrillNode = new LastDrillNode(model);

  mainContent.addChild(
    new HBox({
      spacing: 20,
      align: "top",
      children: [
        new VBox({
          spacing: 5,
          children: [
            whiteBlackSwitch,
            controlButtons,
            fileButtons,
            drillButtons,
            stackContainer,
          ],
        }),
        new VBox({
          align: "left",
          spacing: 3,
          children: [fenText, openingNameText, moveContainer, lastDrillNode],
        }),
      ],
    }),
  );

  const pgnInput = document.createElement("textarea");
  pgnInput.addEventListener("input", () => {
    try {
      model.setPGN(pgnInput.value);
    } catch (e) {
      console.error(e);
    }
  });
  document.body.appendChild(pgnInput);

  if (window.caches) {
    (async () => {
      (await caches.open("pwa-assets")).addAll([
        "../build/chess-openings.html",
        "../contrib/chessground-examples-assets/chessground.css",
        "../contrib/chessground-examples-assets/theme.css",
        "../contrib/chessground-examples-assets/cburnett.css",
        "../contrib/chessground-examples-assets/images/board/brown.svg",
        "../manifests/chess-openings.webmanifest",
      ]);

      console.log("cached");

      console.log(`persisted: ${await navigator.storage.persisted()}`);
    })();
  }
})();
