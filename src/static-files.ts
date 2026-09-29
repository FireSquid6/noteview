import { Elysia } from "elysia";
import { MDSERVE_ROUTE, PACKAGE_FILES_PREFIX } from "./routes";
import { prepareAsset, staticResponse, type StaticAsset } from "./http-response";
import jsSource from "../static/main.text.js";
import cssSource from "../static/main.text.css";
import highlightCss from "text:node_modules/highlight.js/styles/tokyo-night-dark.css";
import katexCss from "text:node_modules/katex/dist/katex.css";
import mermaidJs from "text:node_modules/mermaid/dist/mermaid.min.js";
import fontData from "font-dir:node_modules/katex/dist/fonts";

const packageFileSources: Record<string, StaticAsset> = {
  "highlight.css": prepareAsset(highlightCss, "text/css"),
  "katex.css": prepareAsset(katexCss, "text/css"),
  "mermaid.js": prepareAsset(mermaidJs, "text/javascript"),
};

const mainJs = prepareAsset(jsSource as unknown as string, "text/javascript");
const mainCss = prepareAsset(cssSource as unknown as string, "text/css");
const fontSources = Object.fromEntries(
  Object.entries(fontData as Record<string, string>).map(([name, base64]) => {
    const ext = name.split(".").pop()!;
    const mimeTypes: Record<string, string> = {
      woff2: "font/woff2",
      woff: "font/woff",
      ttf: "font/ttf",
    };
    return [name, prepareAsset(Buffer.from(base64, "base64"), mimeTypes[ext] ?? "application/octet-stream")];
  })
);

export function staticFilesPlugin() {
  return new Elysia()
    .get(`${MDSERVE_ROUTE}/main.js`, (ctx) => {
      return staticResponse(ctx.request, mainJs);
    })
    .get(`${MDSERVE_ROUTE}/main.css`, (ctx) => {
      return staticResponse(ctx.request, mainCss);
    })
    .get(`${PACKAGE_FILES_PREFIX}/fonts/*`, (ctx) => {
      const fontName = ctx.path.split("/").pop()!;
      const font = fontSources[fontName];
      if (!font) return ctx.status(404);
      return staticResponse(ctx.request, font);
    })
    .get(`${PACKAGE_FILES_PREFIX}/*`, (ctx) => {
      const requestedFilename = ctx.path.split("/").pop()!;
      const file = packageFileSources[requestedFilename];
      if (!file) return ctx.status(404);
      return staticResponse(ctx.request, file);
    });
}
