import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import fs from "fs";
import os from "os";
import path from "path";
import { exportSite } from "./export-site";
import { getContentPage, jsxToHtml } from "./frontend";
import type { Node } from "./filemap";

const root: Node = {
  type: "directory",
  name: "",
  children: [],
  content: { type: "markdown-file", filepath: "index.md" },
};

test("layout keeps feature runtimes off the blocking path", () => {
  const html = jsxToHtml(getContentPage({
    content: "<p>Hello</p>",
    filename: "index.md",
    filetree: root,
    activePath: [],
  }));

  expect(html).not.toContain("/__packagefiles/mermaid.js");
  expect(html).not.toContain("/__packagefiles/katex.js");
  expect(html).not.toContain("/__packagefiles/htmx.js");
  expect(html).not.toContain("hx-boost");
  expect(html).toContain('<script defer src="/__mdserve/main.js"></script>');
  expect(html).toContain('localStorage.getItem("theme")');
});

test("browser code loads Mermaid only when rendering diagrams", () => {
  const source = fs.readFileSync(path.join(import.meta.dir, "../static/main.text.js"), "utf-8");

  expect(source).toContain("document.querySelectorAll('.mermaid:not([data-processed])')");
  expect(source).toContain("script.src = '/__packagefiles/mermaid.js'");
  expect(source).toContain("startOnLoad: false");
});

describe("static export assets", () => {
  let workspace: string;
  let input: string;
  let output: string;

  beforeAll(async () => {
    workspace = fs.mkdtempSync(path.join(os.tmpdir(), "noteview-assets-"));
    input = path.join(workspace, "notes");
    output = path.join(workspace, "site");
    fs.mkdirSync(input);
    fs.mkdirSync(path.join(output, "__packagefiles"), { recursive: true });
    fs.writeFileSync(path.join(input, "index.md"), "# Export test");
    fs.writeFileSync(path.join(output, "__packagefiles/katex.js"), "stale");
    fs.writeFileSync(path.join(output, "__packagefiles/tailwind.css"), "stale");
    fs.writeFileSync(path.join(output, "__packagefiles/htmx.js"), "stale");
    await exportSite(input, output);
  });

  afterAll(() => {
    fs.rmSync(workspace, { recursive: true, force: true });
  });

  test("copies the minified Mermaid build and no KaTeX runtime", () => {
    const exportedMermaid = fs.readFileSync(path.join(output, "__packagefiles/mermaid.js"));
    const minifiedMermaid = fs.readFileSync(
      path.join(import.meta.dir, "../node_modules/mermaid/dist/mermaid.min.js")
    );

    expect(exportedMermaid.equals(minifiedMermaid)).toBe(true);
    expect(fs.existsSync(path.join(output, "__packagefiles/katex.js"))).toBe(false);
    expect(fs.existsSync(path.join(output, "__packagefiles/tailwind.css"))).toBe(false);
    expect(fs.existsSync(path.join(output, "__packagefiles/htmx.js"))).toBe(false);
  });

  test("exports a non-blocking page", () => {
    const html = fs.readFileSync(path.join(output, "index.html"), "utf-8");

    expect(html).not.toContain("/__packagefiles/mermaid.js");
    expect(html).not.toContain("/__packagefiles/katex.js");
    expect(html).toContain('<script defer src="/__mdserve/main.js"></script>');
  });
});
