import fs from "fs";
import path from "path";
import { getFileTree, type Node } from "./filemap";
import { renderHtml } from "./renderer";
import { getContentPage, getDirectoryPage, jsxToHtml } from "./frontend";
const PACKAGE_ROOT = path.resolve(import.meta.dir, "..");

const packageFiles: Record<string, string> = {
  "highlight.css": "node_modules/highlight.js/styles/tokyo-night-dark.css",
  "katex.css": "node_modules/katex/dist/katex.css",
  "htmx.js": "node_modules/htmx.org/dist/htmx.min.js",
  "katex.js": "node_modules/katex/dist/katex.js",
  "tailwind.css": "node_modules/tailwindcss/index.css",
  "mermaid.js": "node_modules/mermaid/dist/mermaid.js",
};

export async function exportSite(inputDir: string, outputDir: string): Promise<void> {
  const absoluteInput = path.resolve(inputDir);
  const absoluteOutput = path.resolve(outputDir);

  if (!fs.existsSync(absoluteInput) || !fs.statSync(absoluteInput).isDirectory()) {
    console.error(`Error: input "${inputDir}" is not a directory`);
    process.exit(1);
  }
  if (fs.existsSync(absoluteOutput) && !fs.statSync(absoluteOutput).isDirectory()) {
    console.error(`Error: output "${outputDir}" exists and is not a directory`);
    process.exit(1);
  }

  fs.mkdirSync(absoluteOutput, { recursive: true });

  const filetree = getFileTree(absoluteInput);

  console.log(`Exporting ${absoluteInput} → ${absoluteOutput}`);
  await walkAndExport(filetree, [], absoluteInput, absoluteOutput, filetree);

  copyAssets(absoluteOutput);
  console.log("Done.");
}

async function walkAndExport(
  node: Node,
  pathParts: string[],
  inputRoot: string,
  outputRoot: string,
  filetree: Node
): Promise<void> {
  const { content } = node;

  if (content.type === "static-file") {
    const relPath = path.relative(inputRoot, content.filepath);
    const dest = path.join(outputRoot, relPath);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(content.filepath, dest);
    console.log(`  copy  ${relPath}`);
    return;
  }

  // markdown-file or directory-listing → write index.html
  const htmlDest =
    pathParts.length === 0
      ? path.join(outputRoot, "index.html")
      : path.join(outputRoot, ...pathParts, "index.html");

  fs.mkdirSync(path.dirname(htmlDest), { recursive: true });

  if (content.type === "markdown-file") {
    const text = fs.readFileSync(content.filepath, "utf-8");
    const rendered = await renderHtml(text);
    const page = getContentPage({
      content: rendered,
      filename: path.basename(content.filepath),
      filetree,
      activePath: pathParts,
    });
    fs.writeFileSync(htmlDest, jsxToHtml(page), "utf-8");
  } else {
    // directory-listing
    const dirName = pathParts.at(-1) ?? path.basename(inputRoot);
    const page = getDirectoryPage({ filetree, directoryName: dirName, activePath: pathParts });
    fs.writeFileSync(htmlDest, jsxToHtml(page), "utf-8");
  }

  const relDest = path.relative(outputRoot, htmlDest);
  console.log(`  write ${relDest}`);

  if (node.type === "directory") {
    for (const child of node.children) {
      await walkAndExport(child, [...pathParts, child.name], inputRoot, outputRoot, filetree);
    }
  }
}

function copyAssets(outputRoot: string): void {
  // main.css and main.js
  const mdserveDir = path.join(outputRoot, "__mdserve");
  fs.mkdirSync(mdserveDir, { recursive: true });
  fs.copyFileSync(
    path.join(PACKAGE_ROOT, "static/main.text.css"),
    path.join(mdserveDir, "main.css")
  );
  fs.copyFileSync(
    path.join(PACKAGE_ROOT, "static/main.text.js"),
    path.join(mdserveDir, "main.js")
  );

  // Package files (highlight.css, katex.css, katex.js, mermaid.js, htmx.js, …)
  const pkgFilesDir = path.join(outputRoot, "__packagefiles");
  fs.mkdirSync(pkgFilesDir, { recursive: true });
  for (const [name, relativePath] of Object.entries(packageFiles)) {
    const src = path.join(PACKAGE_ROOT, relativePath);
    if (fs.existsSync(src)) {
      fs.copyFileSync(src, path.join(pkgFilesDir, name));
    }
  }

  // KaTeX fonts (referenced as relative URLs from katex.css)
  const srcFontsDir = path.join(PACKAGE_ROOT, "node_modules/katex/dist/fonts");
  const destFontsDir = path.join(pkgFilesDir, "fonts");
  fs.mkdirSync(destFontsDir, { recursive: true });
  for (const fontFile of fs.readdirSync(srcFontsDir)) {
    fs.copyFileSync(path.join(srcFontsDir, fontFile), path.join(destFontsDir, fontFile));
  }

  console.log("  assets copied");
}
