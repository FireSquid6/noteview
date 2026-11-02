import jsSource from "../static/main.text.js";
import cssSource from "../static/main.text.css";
import highlightCss from "text:node_modules/highlight.js/styles/tokyo-night-dark.css";
import katexCss from "text:node_modules/katex/dist/katex.css";
import mermaidJs from "text:node_modules/mermaid/dist/mermaid.min.js";
import fontData from "font-dir:node_modules/katex/dist/fonts";

// These imports are replaced by build/plugin.ts at bundle time. Keep one source
// for serving, static export, and PDF so compiled binaries need no source tree.
export const mainAssets = {
  "main.js": jsSource as string,
  "main.css": cssSource as string,
};

export const packageAssets = {
  "highlight.css": highlightCss,
  "katex.css": katexCss,
  "mermaid.js": mermaidJs,
};

export const fontAssets: Record<string, Buffer> = Object.fromEntries(
  Object.entries(fontData as Record<string, string>).map(([name, base64]) => [
    name,
    Buffer.from(base64, "base64"),
  ])
);
