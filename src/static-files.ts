import { Elysia } from "elysia";
import { MDSERVE_ROUTE, PACKAGE_FILES_PREFIX } from "./server";
import path from "path";
import jsSource from "../static/main.text.js" with { type: "text" };
import cssSource from "../static/main.text.css" with { type: "text" };
import highlightCss from "highlight.js/styles/tokyo-night-dark.css" with { type: "text" };
import katexCss from "katex/dist/katex.css" with { type: "text" };
import htmxJs from "htmx.org/dist/htmx.min.js" with { type: "text" };
import katexJs from "katex/dist/katex.js" with { type: "text" };
import tailwindCss from "tailwindcss/index.css" with { type: "text" };
import mermaidJs from "mermaid/dist/mermaid.js" with { type: "text" };

const packageFileSources: Record<string, { content: string; type: string }> = {
  "highlight.css": { content: highlightCss, type: "text/css" },
  "katex.css": { content: katexCss, type: "text/css" },
  "htmx.js": { content: htmxJs, type: "text/javascript" },
  "katex.js": { content: katexJs, type: "text/javascript" },
  "tailwind.css": { content: tailwindCss, type: "text/css" },
  "mermaid.js": { content: mermaidJs, type: "text/javascript" },
};

const katexFontsDirectory = path.resolve(import.meta.dir, "..", "node_modules", "katex", "dist", "fonts");

export interface StaticFilesPluginOptions {
  customThemePath: string | null;
}

export function staticFilesPlugin({ customThemePath }: StaticFilesPluginOptions) {
  return new Elysia()
    .get(`${MDSERVE_ROUTE}/main.js`, (ctx) => {
      ctx.set.headers["content-type"] = "text/javascript";
      return ctx.status(200, jsSource);
    })
    .get(`${MDSERVE_ROUTE}/main.css`, (ctx) => {
      ctx.set.headers["content-type"] = "text/css";
      return ctx.status(200, cssSource);
    })
    .get(`${MDSERVE_ROUTE}/theme.css`, async (ctx) => {
      if (customThemePath === null) return ctx.status(404);
      const themeFile = Bun.file(customThemePath);
      if (!(await themeFile.exists())) return ctx.status(404);
      ctx.set.headers["content-type"] = "text/css";
      return ctx.status(200, themeFile);
    })
    .get(`${PACKAGE_FILES_PREFIX}/fonts/*`, async (ctx) => {
      const fontName = ctx.path.split("/").pop()!;
      if (fontName !== path.basename(fontName)) return ctx.status(404);
      const fontPath = path.join(katexFontsDirectory, fontName);
      const fontFile = Bun.file(fontPath);
      if (!(await fontFile.exists())) return ctx.status(404);

      const ext = fontName.split(".").pop()!;
      const mimeTypes: Record<string, string> = {
        woff2: "font/woff2",
        woff: "font/woff",
        ttf: "font/ttf",
      };
      ctx.set.headers["content-type"] = mimeTypes[ext] ?? "application/octet-stream";
      return ctx.status(200, fontFile);
    })
    .get(`${PACKAGE_FILES_PREFIX}/*`, (ctx) => {
      const requestedFilename = ctx.path.split("/").pop()!;
      const file = packageFileSources[requestedFilename];
      if (!file) return ctx.status(404);
      ctx.set.headers["content-type"] = file.type;
      return ctx.status(200, file.content);
    });
}
