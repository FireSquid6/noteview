import { renderHtml } from "./renderer";
import { DocumentContent } from "./frontend/components/DocumentContent";
import { escapeHtml } from "@kitajs/html";
import { readFileSync, writeFileSync, rmSync, mkdirSync, mkdtempSync, statSync } from "fs";
import { resolve, dirname, basename, extname, join } from "path";
import { tmpdir } from "os";
import { pathToFileURL } from "url";
import puppeteer from "puppeteer";
import { writeAssets } from "./write-assets";


// Convert relative image src paths to absolute file:// URLs so puppeteer can load them
function resolveImagePaths(html: string, fileDir: string): string {
  return html.replace(
    /(<img\b[^>]*?\bsrc=)(["'])([^"']+)\2/gi,
    (match, before, quote, src) => {
      if (/^(?:https?|data|file):/.test(src)) {
        return match;
      }
      return `${before}${quote}file://${resolve(fileDir, src)}${quote}`;
    }
  );
}

function buildHtmlPage(contentHtml: string, fileDir: string, assetDir: string, title: string, mlaMode: boolean): string {
  const assetUrl = (relativePath: string) => pathToFileURL(join(assetDir, relativePath)).href;

  const processed = resolveImagePaths(contentHtml, fileDir);

  return `<!DOCTYPE html>
<html data-theme="light"${mlaMode ? ' data-mla="true"' : ""}>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)}</title>
  <link rel="stylesheet" href="${assetUrl("__packagefiles/highlight.css")}" />
  <link rel="stylesheet" href="${assetUrl("__packagefiles/katex.css")}" />
  <link rel="stylesheet" href="${assetUrl("__mdserve/main.css")}" />
  <script src="${assetUrl("__packagefiles/mermaid.js")}"></script>
  <script>
    mermaid.initialize({ startOnLoad: false, theme: 'default', securityLevel: 'loose' });
  </script>
</head>
<body>
  <div class="app-layout">
    <div class="main-layout">
      <div class="content-wrapper">
        <main class="content">
          ${processed}
        </main>
      </div>
    </div>
  </div>
  <script>
    (async () => { await mermaid.run(); })();
  </script>
</body>
</html>`;
}

export async function exportToPdf(inputPath: string, outputPath: string, mlaMode = false): Promise<void> {
  const absoluteInput = resolve(inputPath);
  const absoluteOutput = resolve(outputPath);
  const fileDir = dirname(absoluteInput);
  const filename = basename(absoluteInput);

  // Validate output path
  if (extname(absoluteOutput).toLowerCase() !== ".pdf") {
    console.error(`Error: output file must end in .pdf (got "${outputPath}")`);
    process.exit(1);
  }
  try {
    if (statSync(absoluteOutput).isDirectory()) {
      console.error(`Error: output path "${outputPath}" is a directory`);
      process.exit(1);
    }
  } catch {
    // File doesn't exist yet — that's fine
  }

  // Create output directory if it doesn't exist
  mkdirSync(dirname(absoluteOutput), { recursive: true });

  console.log(`Rendering ${absoluteInput}...`);
  const markdown = readFileSync(absoluteInput, "utf-8");
  const renderedDocument = await renderHtml(markdown);
  const title = renderedDocument.mla.title ?? basename(absoluteInput, ".md");
  const contentHtml = `${DocumentContent({ document: renderedDocument, filename })}`;

  const tempDir = mkdtempSync(join(tmpdir(), "noteview-pdf-"));
  let browser: Awaited<ReturnType<typeof puppeteer.launch>> | undefined;
  try {
    writeAssets(tempDir);
    const tempFile = join(tempDir, "index.html");
    writeFileSync(tempFile, buildHtmlPage(contentHtml, fileDir, tempDir, title, mlaMode), "utf-8");
    browser = await puppeteer.launch({ headless: true });
    console.log("Launching headless browser...");
    const page = await browser.newPage();
    await page.goto(pathToFileURL(tempFile).href, { waitUntil: "networkidle0" });

    // Wait for Mermaid to finish processing all diagrams
    await page
      .waitForFunction(
        () => document.querySelectorAll(".mermaid:not([data-processed])").length === 0,
        { timeout: 15000 }
      )
      .catch(() => {
        console.warn("Warning: some Mermaid diagrams may not have fully rendered");
      });

    await page.pdf({
      path: absoluteOutput,
      format: mlaMode ? "letter" : "A4",
      printBackground: true,
      margin: mlaMode
        ? undefined
        : { top: "2cm", right: "2cm", bottom: "2cm", left: "2cm" },
    });

    console.log(`Saved to ${absoluteOutput}`);
  } finally {
    await browser?.close();
    rmSync(tempDir, { recursive: true, force: true });
  }
}
