import fs from "fs";
import path from "path";
import { getFileTree, type Node } from "./filemap";
import { renderHtml } from "./renderer";
import { getContentPage, getDirectoryPage, jsxToHtml } from "./frontend";
import { writeAssets } from "./write-assets";

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

  writeAssets(absoluteOutput);
  console.log("  assets copied");
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
    const document = await renderHtml(text);
    const page = getContentPage({
      document,
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
