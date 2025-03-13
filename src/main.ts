import { QueryStringMachine } from "scenerystack/query-string-machine";
import { enableAssert } from "scenerystack/assert";
import { Multilink, Property, stepTimer } from "scenerystack/axon";
import { Bounds2 } from "scenerystack/dot";
import { Color, Display, HBox, Node, VBox } from "scenerystack/scenery";
import { Chess } from "chess.js";
import chessOpenings from "./data/chessOpenings";
import { SaveState } from "./model/common";
import { Nodes } from "./model/ChessNode";
import { StackMove } from "./model/StackMove.js";
import { SignInNode } from "./view/SignInNode.js";
import {
  loadUserState,
  userLoadedPromise,
  userPromise,
  userProperty,
} from "./model/firebase-actions.js";
import { backgroundColorProperty } from "./view/theme.js";
import { StackNode } from "./view/StackNode.js";
import { Model } from "./model/Model.js";
import { glassPane, ViewContext } from "scenery-toolkit";
import { LastDrillNode } from "./view/LastDrillNode.js";
import { MainControlsNode } from "./view/MainControlsNode.js";
import { ChessgroundView } from "./view/ChessgroundView.js";
import { OpeningInfoNode } from "./view/OpeningInfoNode.js";
import { MovesNode } from "./view/MovesNode.js";

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

  const model = new Model(usedChessOpenings, usedOnlineChessOpenings);

  new ChessgroundView(model, boardDiv);

  const stackNode = new StackNode(model);

  const mainControlsNode = new MainControlsNode(model, viewContext);

  const openingInfoNode = new OpeningInfoNode(model);

  const movesNode = new MovesNode(model);

  const lastDrillNode = new LastDrillNode(model);

  mainContent.addChild(
    new HBox({
      spacing: 20,
      align: "top",
      children: [
        new VBox({
          spacing: 5,
          children: [mainControlsNode, stackNode],
        }),
        new VBox({
          align: "left",
          spacing: 3,
          children: [openingInfoNode, movesNode, lastDrillNode],
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
})();
