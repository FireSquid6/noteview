import fs from "fs";
import path from "path";
import { mainAssets, packageAssets, fontAssets } from "./embedded-assets";

export function writeAssets(outputRoot: string): void {
  const mdserveDir = path.join(outputRoot, "__mdserve");
  fs.mkdirSync(mdserveDir, { recursive: true });
  for (const [name, content] of Object.entries(mainAssets)) {
    fs.writeFileSync(path.join(mdserveDir, name), content);
  }

  const pkgFilesDir = path.join(outputRoot, "__packagefiles");
  fs.rmSync(pkgFilesDir, { recursive: true, force: true });
  fs.mkdirSync(pkgFilesDir, { recursive: true });
  for (const [name, content] of Object.entries(packageAssets)) {
    fs.writeFileSync(path.join(pkgFilesDir, name), content);
  }

  // KaTeX CSS references fonts relative to its own location.
  const destFontsDir = path.join(pkgFilesDir, "fonts");
  fs.mkdirSync(destFontsDir, { recursive: true });
  for (const [name, content] of Object.entries(fontAssets)) {
    fs.writeFileSync(path.join(destFontsDir, name), content);
  }
}
