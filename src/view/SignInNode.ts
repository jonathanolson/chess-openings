import { Node, VBox } from "scenerystack/scenery";
import { Panel, TextPushButton } from "scenerystack/sun";
import { signInWithGoogle, userProperty } from "../model/firebase-actions.js";

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
                listener: async () => {
                  const user = await signInWithGoogle();

                  userProperty.value = user;
                },
              }),
            ],
          }),
        ),
      ],
    });
  }
}
