import { BooleanProperty } from "scenerystack/axon";

const mediaQueryList = window.matchMedia('(prefers-color-scheme: dark)');

export const isOSDarkModeProperty = new BooleanProperty(mediaQueryList.matches);
mediaQueryList.addEventListener('change', (e) => {
  isOSDarkModeProperty.value = e.matches;
});