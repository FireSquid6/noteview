import { Elysia } from "elysia";
import { MDSERVE_ROUTE, PACKAGE_FILES_PREFIX } from "./server";
import jsSource from "../static/main.text.js";
import cssSource from "../static/main.text.css";
import highlightCss from "text:node_modules/highlight.js/styles/tokyo-night-dark.css";
import katexCss from "text:node_modules/katex/dist/katex.css";
import htmxJs from "text:node_modules/htmx.org/dist/htmx.min.js";
import katexJs from "text:node_modules/katex/dist/katex.js";
import tailwindCss from "text:node_modules/tailwindcss/index.css";
import mermaidJs from "text:node_modules/mermaid/dist/mermaid.js";
import fontData from "font-dir:node_modules/katex/dist/fonts";

const packageFileSources: Record<string, { content: string; type: string }> = {
  "highlight.css": { content: highlightCss, type: "text/css" },
  "katex.css": { content: katexCss, type: "text/css" },
  "htmx.js": { content: htmxJs, type: "text/javascript" },
  "katex.js": { content: katexJs, type: "text/javascript" },
  "tailwind.css": { content: tailwindCss, type: "text/css" },
  "mermaid.js": { content: mermaidJs, type: "text/javascript" },
};

export function staticFilesPlugin() {
  return new Elysia()
    .get(`${MDSERVE_ROUTE}/main.js`, (ctx) => {
      ctx.set.headers["content-type"] = "text/javascript";
      return ctx.status(200, jsSource);
    })
    .get(`${MDSERVE_ROUTE}/main.css`, (ctx) => {
      ctx.set.headers["content-type"] = "text/css";
      return ctx.status(200, cssSource);
    })
    .get(`${PACKAGE_FILES_PREFIX}/fonts/*`, (ctx) => {
      const fontName = ctx.path.split("/").pop()!;
      const base64 = (fontData as Record<string, string>)[fontName];
      if (!base64) return ctx.status(404);

      const ext = fontName.split(".").pop()!;
      const mimeTypes: Record<string, string> = {
        woff2: "font/woff2",
        woff: "font/woff",
        ttf: "font/ttf",
      };
      ctx.set.headers["content-type"] = mimeTypes[ext] ?? "application/octet-stream";
      return ctx.status(200, Buffer.from(base64, "base64"));
    })
    .get(`${PACKAGE_FILES_PREFIX}/*`, (ctx) => {
      const requestedFilename = ctx.path.split("/").pop()!;
      const file = packageFileSources[requestedFilename];
      if (!file) return ctx.status(404);
      ctx.set.headers["content-type"] = file.type;
      return ctx.status(200, file.content);
    });
}
