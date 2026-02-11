import path from "path";
import fs from "fs";
import { Elysia } from "elysia";
import { MDSERVE_ROUTE, PACKAGE_FILES_PREFIX } from "./server";
import jsSource from "../static/main.text.js";
import cssSource from "../static/main.text.css";

export const packageFiles: Record<string, string> = {
  "highlight.css": "node_modules/highlight.js/styles/tokyo-night-dark.css",
  "katex.css": "node_modules/katex/dist/katex.css",
  "htmx.js": "node_modules/htmx.org/dist/htmx.min.js",
  "katex.js": "node_modules/katex/dist/katex.js",
  "tailwind.css": "node_modules/tailwindcss/index.css",
  "mermaid.js": "node_modules/mermaid/dist/mermaid.js",
}

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
    .get(`${PACKAGE_FILES_PREFIX}/fonts/*`, async (ctx)=> {
      const fontName = ctx.path.split("/").pop()!;
      const filepath = path.join("node_modules/katex/dist/fonts", fontName);

      return Bun.file(filepath);

    })
    .get(`${PACKAGE_FILES_PREFIX}/*`, async (ctx) => {
      const requestedFilename = ctx.path.split("/").pop()!;
      const foundFilename = Object.keys(packageFiles).find(k => k === requestedFilename);

      if (foundFilename === undefined) {
        return ctx.status(404);
      }

      const filepath = path.resolve(
        __dirname,
        "..",
        packageFiles[foundFilename]!
      );


      if (!fs.existsSync(filepath)) {
        return ctx.status(404);
      }

      return ctx.status(200, Bun.file(filepath));

    })
}
