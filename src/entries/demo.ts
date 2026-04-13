import "../../css/styles.css";
import { bootstrapDemoApp } from "../lib/demo.js";
import { mountThink2Page } from "../lib/page-shell.js";

const main = document.getElementById("main");
if (!(main instanceof HTMLElement)) {
  throw new Error("Missing #main");
}
mountThink2Page(main, "demo");
void bootstrapDemoApp();
