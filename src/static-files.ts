import { Elysia } from "elysia";
import { MDSERVE_ROUTE, PACKAGE_FILES_PREFIX } from "./routes";
import { prepareAsset, staticResponse, type StaticAsset } from "./http-response";
import { mainAssets, packageAssets, fontAssets } from "./embedded-assets";

const packageFileSources: Record<string, StaticAsset> = {
  "highlight.css": prepareAsset(packageAssets["highlight.css"], "text/css"),
  "katex.css": prepareAsset(packageAssets["katex.css"], "text/css"),
  "mermaid.js": prepareAsset(packageAssets["mermaid.js"], "text/javascript"),
};

const mainJs = prepareAsset(mainAssets["main.js"], "text/javascript");
const mainCss = prepareAsset(mainAssets["main.css"], "text/css");
const fontSources = Object.fromEntries(
  Object.entries(fontAssets).map(([name, bytes]) => {
    const ext = name.split(".").pop()!;
    const mimeTypes: Record<string, string> = {
      woff2: "font/woff2",
      woff: "font/woff",
      ttf: "font/ttf",
    };
    return [name, prepareAsset(bytes, mimeTypes[ext] ?? "application/octet-stream")];
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
