import path from "path";
import fs from "fs";
import { type BunPlugin } from "bun";

export const textLoaderPlugin: BunPlugin = {
  name: "text-loader",
  setup(build) {
    build.onLoad({ filter: /\.text\.(js|css)$/ }, async (args) => {
      if (args.path.includes("loader.ts")) return;

      const text = await Bun.file(args.path).text();
      return {
        contents: `export default ${JSON.stringify(text)}`,
        loader: "js",
      };
    });

    // text: namespace — embed any text file from an arbitrary path at build time
    build.onResolve({ filter: /^text:/ }, (args) => ({
      path: path.resolve(import.meta.dir, "..", args.path.slice("text:".length)),
      namespace: "text-embed",
    }));
    build.onLoad({ filter: /.*/, namespace: "text-embed" }, async (args) => {
      const text = await Bun.file(args.path).text();
      return {
        contents: `export default ${JSON.stringify(text)}`,
        loader: "js",
      };
    });

    // font-dir: namespace — embed all files in a directory as base64 strings at build time
    build.onResolve({ filter: /^font-dir:/ }, (args) => ({
      path: path.resolve(import.meta.dir, "..", args.path.slice("font-dir:".length)),
      namespace: "font-directory",
    }));
    build.onLoad({ filter: /.*/, namespace: "font-directory" }, (args) => {
      const files = fs.readdirSync(args.path);
      const entries = files.map((file) => {
        const data = fs.readFileSync(path.join(args.path, file));
        return `${JSON.stringify(file)}: ${JSON.stringify(data.toString("base64"))}`;
      });
      return {
        contents: `export default { ${entries.join(", ")} };`,
        loader: "js",
      };
    });
  },
};
