import { renderHtml } from "./renderer";
import { readFileSync, writeFileSync, unlinkSync, mkdirSync, statSync } from "fs";
import { resolve, dirname, basename, extname } from "path";
import { fileURLToPath } from "url";
import { tmpdir } from "os";
import { join } from "path";
import puppeteer from "puppeteer";

const PACKAGE_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function resolvePackageFile(relativePath: string): string {
  return resolve(PACKAGE_ROOT, relativePath);
}

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

function buildHtmlPage(contentHtml: string, fileDir: string, title: string): string {
  const highlightCss = resolvePackageFile("node_modules/highlight.js/styles/tokyo-night-dark.css");
  const katexCss = resolvePackageFile("node_modules/katex/dist/katex.css");
  const mainCss = resolvePackageFile("static/main.text.css");
  const mermaidJs = resolvePackageFile("node_modules/mermaid/dist/mermaid.js");

  const processed = resolveImagePaths(contentHtml, fileDir);

  return `<!DOCTYPE html>
<html data-theme="light">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title}</title>
  <link rel="stylesheet" href="file://${highlightCss}" />
  <link rel="stylesheet" href="file://${katexCss}" />
  <link rel="stylesheet" href="file://${mainCss}" />
  <script src="file://${mermaidJs}"></script>
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

export async function exportToPdf(inputPath: string, outputPath: string): Promise<void> {
  const absoluteInput = resolve(inputPath);
  const absoluteOutput = resolve(outputPath);
  const fileDir = dirname(absoluteInput);
  const title = basename(absoluteInput, ".md");

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
  const contentHtml = await renderHtml(markdown);

  const html = buildHtmlPage(contentHtml, fileDir, title);

  // Write to a temp file so that file:// relative URLs (fonts, etc.) resolve correctly
  const tempFile = join(tmpdir(), `mdserve-${Date.now()}.html`);
  writeFileSync(tempFile, html, "utf-8");

  const browser = await puppeteer.launch({ headless: true });
  try {
    console.log("Launching headless browser...");
    const page = await browser.newPage();
    await page.goto(`file://${tempFile}`, { waitUntil: "networkidle0" });

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
      format: "A4",
      printBackground: true,
      margin: { top: "2cm", right: "2cm", bottom: "2cm", left: "2cm" },
    });

    console.log(`Saved to ${absoluteOutput}`);
  } finally {
    await browser.close();
    unlinkSync(tempFile);
  }
}

/**
 * Convert a markdown string to a PDF buffer.
 * Used by the web site API route.
 */
export async function convertMarkdownToPdf(
  markdown: string,
  title: string,
  fileDir: string = process.cwd()
): Promise<Uint8Array> {
  const contentHtml = await renderHtml(markdown);
  const html = buildHtmlPage(contentHtml, fileDir, title);

  const tempFile = join(tmpdir(), `mdserve-${Date.now()}.html`);
  writeFileSync(tempFile, html, "utf-8");

  const browser = await puppeteer.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.goto(`file://${tempFile}`, { waitUntil: "networkidle0" });

    await page
      .waitForFunction(
        () => document.querySelectorAll(".mermaid:not([data-processed])").length === 0,
        { timeout: 15000 }
      )
      .catch(() => {});

    const raw = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "2cm", right: "2cm", bottom: "2cm", left: "2cm" },
    });

    return new Uint8Array(raw);
  } finally {
    await browser.close();
    try { unlinkSync(tempFile); } catch { /* ignore */ }
  }
}
