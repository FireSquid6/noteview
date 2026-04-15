import { Elysia } from "elysia";
import fs from "fs";
import os from "os";
import path from "path";
import { renderHtml } from "./renderer";
import { getContentPage, getDirectoryPage, getSidebarForPage, jsxToHtml } from "./frontend";
import { getFileTree, matchFilePath, printFilemap as printFiletree } from "./filemap";
import { staticFilesPlugin } from "./static-files";
import { searchFileTree } from "./search";


export interface ServeOptions {
  port: number;
  directory: string;
  watchForUpdates: boolean;
}

export const MDSERVE_ROUTE = "/__mdserve"
export const PACKAGE_FILES_PREFIX = "/__packagefiles";



async function isPortInUse(port: number): Promise<boolean> {
  try {
    const socket = await Bun.connect({
      hostname: "localhost",
      port,
      socket: { data() {}, open() {}, close() {}, error() {} },
    });
    socket.end();
    return true;
  } catch {
    return false;
  }
}

export async function serveDirectory({ port, directory, watchForUpdates }: ServeOptions) {
  if (await isPortInUse(port)) {
    console.error(`Port ${port} is already in use. Exiting.`);
    process.exit(1);
  }

  const ft = getFileTree(directory);
  printFiletree(ft);
  const customThemePath = path.join(os.homedir(), ".config", "noteview", "theme.css");
  const customThemeHref =
    fs.existsSync(customThemePath) && fs.statSync(customThemePath).isFile()
      ? `${MDSERVE_ROUTE}/theme.css`
      : undefined;

  const app = new Elysia()
    .state("filetree", ft)
    .use(staticFilesPlugin({ customThemePath: customThemeHref ? customThemePath : null }))
    .get("/__partials/*", async (ctx) => {
      const pathParts = decodeURI(ctx.path).split("/");

      while (pathParts[0] === "" || pathParts[0] === "__partials") {
        pathParts.shift();
      }
      // TODO - ensure path parts actually starts
      const contentData = matchFilePath(pathParts, ctx.store.filetree);

      if (contentData === null) {
        return ctx.status(404);
      }

      ctx.set.headers["content-type"] = "text/plain";
      if (contentData.type === "directory-listing") {
        return ctx.status(200, "NO_UPDATE");
      } else {
        const text = fs.readFileSync(contentData.filepath).toString();
        const content = await renderHtml(text);

        return ctx.status(200, content);
      }

    })
    .get("/__only-sidebar/*", async (ctx) => {
      const pathParts = decodeURI(ctx.path).split("/");

      while (pathParts[0] === "" || pathParts[0] === "__partials") {
        pathParts.shift();
      }
      
      const sidebar = getSidebarForPage(ctx.store.filetree, pathParts);

      ctx.set.headers["content-type"] = "text/plain";
      return ctx.status(200, sidebar);

    })
    .get("/__search", (ctx) => {
      const url = new URL(ctx.request.url);
      const query = url.searchParams.get("q") || "";
      const results = searchFileTree(query, ctx.store.filetree);
      return results;
    })
    .get("/*", async (ctx) => {
      const pathParts = decodeURI(ctx.path).split("/");

      while (pathParts[0] === "") {
        pathParts.shift();
      }
      // TODO - ensure path parts actually starts
      const contentData = matchFilePath(pathParts, ctx.store.filetree);

      if (contentData === null) {
        // TODO - 404 page
        return ctx.status(404);
      }
      const filename = path.basename(contentData.filepath);

      if (contentData.type === "directory-listing") {
        const page = getDirectoryPage({
          filetree: ctx.store.filetree,
          activePath: pathParts,
          directoryName: filename,
          customThemeHref,
        });

        const html = jsxToHtml(page);
        ctx.set.headers["content-type"] = "text/html";
        return ctx.status(200, html);
      } else if (contentData.type === "static-file") {
        return new Response(Bun.file(contentData.filepath));
      } else {
        const text = fs.readFileSync(contentData.filepath).toString();
        const content = await renderHtml(text);


        const page = getContentPage({
          filetree: ctx.store.filetree,
          activePath: pathParts,
          content,
          filename,
          customThemeHref,
        });
        const html = jsxToHtml(page);

        ctx.set.headers["content-type"] = "text/html";
        return ctx.status(200, html);
      }

    })
    .ws("/__update-listener", {
      open(ws) {
        ws.subscribe("updates");
      },
      close(ws) {
        ws.unsubscribe("updates");
      }
    })
    .listen(port, () => {
      console.log(`Listening on port ${port}`);
    })
  
  if (watchForUpdates) {
    const updater = timeoutRun(() => {
      const filetree = getFileTree(directory);
      console.log("\nUpdated:")
      printFiletree(filetree);

      app.store.filetree = filetree;
      app.server!.publish("updates", "UPDATE");

    }, 1000);

    fs.watch(directory, { recursive: true }, () => {
      updater();
    });
  }
}


function timeoutRun<T extends (...args: any[]) => any>(
  f: T,
  t: number
): (...args: Parameters<T>) => void {
  let lastCallTime = 0;

  return function(...args: Parameters<T>) {
    const now = Date.now();
    if (now - lastCallTime >= t) {
      lastCallTime = now;
      f(...args);
    }
  };
}
