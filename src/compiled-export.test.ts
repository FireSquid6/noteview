import { expect, test } from "bun:test";
import fs from "fs";
import os from "os";
import path from "path";
import { spawnSync } from "child_process";
import { textLoaderPlugin } from "../build/plugin";

test("compiled executable exports all assets outside the checkout", async () => {
  const scratch = process.env.TMPDIR ?? path.join(os.homedir(), ".hermes/cache/scratch");
  const workspace = fs.mkdtempSync(path.join(scratch, "noteview-compiled-export-"));
  try {
    const bundle = path.join(workspace, "index.js");
    const binary = path.join(workspace, "noteview");
    const input = path.join(workspace, "notes");
    const output = path.join(workspace, "site");
    const cwd = path.join(workspace, "elsewhere");
    fs.mkdirSync(input);
    fs.mkdirSync(cwd);
    fs.writeFileSync(path.join(input, "index.md"), "# Export test\n\n$E=mc^2$\n");

    const result = await Bun.build({
      entrypoints: [path.join(import.meta.dir, "index.ts")],
      outdir: workspace,
      target: "bun",
      plugins: [textLoaderPlugin],
    });
    expect(result.success).toBe(true);

    const compile = spawnSync(process.execPath, ["build", bundle, "--compile", "--outfile", binary], {
      cwd,
      encoding: "utf-8",
    });
    expect(compile.stderr).toBe("");
    expect(compile.status).toBe(0);

    const run = spawnSync(binary, ["export", "-i", input, "-o", output], {
      cwd,
      encoding: "utf-8",
    });
    expect(run.status).toBe(0);
    expect(run.stdout).toContain("Done.");

    const html = fs.readFileSync(path.join(output, "index.html"), "utf-8");
    expect(html).toContain("/__mdserve/main.css");
    expect(html).toContain("/__packagefiles/katex.css");
    expect(html).toContain("katex");

    const checks: Record<string, string> = {
      "__mdserve/main.css": "static/main.text.css",
      "__mdserve/main.js": "static/main.text.js",
      "__packagefiles/highlight.css": "node_modules/highlight.js/styles/tokyo-night-dark.css",
      "__packagefiles/katex.css": "node_modules/katex/dist/katex.css",
      "__packagefiles/mermaid.js": "node_modules/mermaid/dist/mermaid.min.js",
    };
    const repoRoot = path.resolve(import.meta.dir, "..");
    for (const [dest, source] of Object.entries(checks)) {
      expect(fs.readFileSync(path.join(output, dest)).equals(fs.readFileSync(path.join(repoRoot, source)))).toBe(true);
    }

    const fonts = fs.readdirSync(path.join(repoRoot, "node_modules/katex/dist/fonts"));
    expect(fonts.length).toBeGreaterThan(0);
    for (const font of fonts) {
      expect(fs.readFileSync(path.join(output, "__packagefiles/fonts", font)).equals(
        fs.readFileSync(path.join(repoRoot, "node_modules/katex/dist/fonts", font))
      )).toBe(true);
    }
    const css = fs.readFileSync(path.join(output, "__packagefiles/katex.css"), "utf-8");
    for (const [, font] of css.matchAll(/url\(fonts\/([^)]*)\)/g)) {
      expect(fs.existsSync(path.join(output, "__packagefiles/fonts", font))).toBe(true);
    }
  } finally {
    fs.rmSync(workspace, { recursive: true, force: true });
  }
}, 120_000);
