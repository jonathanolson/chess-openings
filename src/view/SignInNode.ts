import { Font, Node, VBox } from "scenerystack/scenery";
import { Panel, TextPushButton } from "scenerystack/sun";
import {
  signInWithGoogle,
  signInWithGoogleRedirect,
  userProperty,
} from "../model/firebase-actions.js";

export class SignInNode extends Node {
  public constructor() {
    super({
      children: [
        new Panel(
          new VBox({
            spacing: 50,
            children: [
              // TODO: borrow theming from slither
              new TextPushButton("Sign in with Google", {
                font: new Font({
                  size: 24,
                  family: "sans-serif",
                }),
                listener: async () => {
                  try {
                    const user = await signInWithGoogle();

                    userProperty.value = user;
                  } catch (e: unknown) {
                    const code = (e as { code: string }).code;

                    const shouldRedirect =
                      code &&
                      (code === "auth/popup-blocked" ||
                        code === "auth/cancelled-popup-request" ||
                        code ===
                          "auth/operation-not-supported-in-this-environment");

                    if (shouldRedirect) {
                      await signInWithGoogleRedirect();
                    } else {
                      throw e;
                    }
                  }
                },
              }),
            ],
          }),
        ),
      ],
    });
  }
}
