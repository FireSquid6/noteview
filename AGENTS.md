# AGENTS.md

## Project Overview

Noteview is a Bun-based CLI that renders a directory of Markdown files as a local website, exports that directory as a static site, or renders one Markdown file to PDF. The application uses Elysia for HTTP/WebSocket serving, Marked for Markdown, Kita JSX for server-rendered HTML, and plain browser JavaScript and CSS for client behavior.

## Tooling

- Use Bun for dependency management and scripts. The lockfile is `bun.lockb`.
- Install dependencies with `bun install --frozen-lockfile`.
- Type-check with `bunx tsc --noEmit`.
- Run tests with `bun test`.
- Bundle with `bun run build/bundle.ts`.
- Build the local executable with `./build/make-binary.sh`.
- Run `bun run build/bundle.ts`, then invoke the CLI with `bun dist/index.js <command>`; for example, `bun dist/index.js serve -d ./example`.
- Do not use `bun run dev` until its missing `entrypoints/dev.ts` target is restored or the script is corrected.

## Architecture

- `src/index.ts` defines the `serve`, `export`, and `to-pdf` CLI commands.
- `src/server.ts` owns Elysia routes, full-page rendering, partial content/sidebar endpoints, search, and watch-mode WebSocket updates.
- `src/filemap.ts` scans the input tree. Markdown files use extensionless route names; an `index.md` supplies a directory's page; other files are served or copied as static assets.
- `src/renderer.ts` configures the process-wide Marked instance for highlighting, KaTeX, Mermaid, GFM-style footnotes, local-link rewriting, and frontmatter parsing.
- `src/works-cited.ts` implements the `<workscited>` block extension, validates YAML-encoded CSL data, and renders it with `static/modern-language-association.csl`. The style is pinned from `citation-style-language/styles` commit `c0c8fd69fb7222b81cfd068d3bccfdb17b833045` and declares CC BY-SA 3.0 licensing in its metadata.
- `src/frontend.tsx` and `src/frontend/components/` produce server-rendered pages with Kita JSX. JSX uses HTML attributes such as `class`, not React's `className`.
- `static/main.text.js` is the source of truth for browser behavior: theme persistence, Mermaid initialization, live refresh, sidebar interactions, printing, and search.
- `static/main.text.css` is the source of truth for application, responsive, light-theme, search, and print styles.
- `src/static-files.ts` embeds browser assets in the served/compiled application through the custom loaders in `build/plugin.ts`.
- `src/export-site.ts` renders every file and copies the same browser assets into a self-contained output tree.
- `src/to-pdf.ts` builds a separate standalone page and prints it with Puppeteer. Changes to page structure, metadata, assets, or print behavior may need corresponding PDF changes.

## Rendering And Data Flow

- A Markdown request is read from disk, passed through `renderHtml`, inserted into `Layout`, and serialized with `jsxToHtml`.
- `front-matter` separates YAML attributes from the Markdown body; `renderHtml` returns validated MLA metadata alongside the rendered body HTML.
- The watch-mode partial endpoint returns only content-container markup. Any document-level data added during rendering must remain correct after `refreshContent()` replaces that container.
- Full pages, static exports, and PDFs call the renderer independently. Keep their output semantics aligned when changing Markdown or frontmatter handling.
- Marked configuration is global. Register extensions at module initialization, not per request.
- Works cited data uses the documented CSL subset. Keep validation, README examples, and renderer tests aligned when adding fields or source types.
- Footnote definitions are collected into an endnote section by `marked-footnote`; references and backlinks require no browser JavaScript.
- Local Markdown links are rewritten from `.md` to extensionless routes in `src/renderer.ts`; preserve URL fragments and external URLs.

## Frontend Conventions

- The frontend is server-rendered HTML plus plain JavaScript, not client-side React. Do not add React hooks or hydration assumptions.
- Browser JavaScript is intentionally unbundled and has no TypeScript checking. Use APIs supported by the existing target browsers and guard optional DOM elements.
- Theme state is stored in `localStorage` under `theme` and reflected by `data-theme` on `<html>`. Mermaid must be re-rendered when its light/dark palette changes.
- Keep desktop, mobile (`1024px` and `768px` breakpoints), and print layouts working.
- Static-site output cannot depend on Elysia-only endpoints. Existing search, WebSocket, and partial-refresh requests are server features and should degrade safely in exports.

## Change Guidelines

- Prefer small changes that follow the existing modules rather than introducing a framework or abstraction layer.
- Keep serve, static export, and PDF behavior in mind for every rendering change; explicitly document when a feature applies to only one output mode.
- Preserve raw HTML handling through Kita JSX when passing rendered Markdown content.
- Add frontmatter types and validation at the renderer boundary rather than spreading unchecked metadata objects through components.
- Never edit generated `dist/` output or dependencies under `node_modules/`.
- Do not overwrite unrelated worktree changes. `install.sh` may contain user changes.

## Verification

- Run `bunx tsc --noEmit` after TypeScript or TSX changes.
- Run `bun test` after renderer or works cited changes.
- Run `bun run build/bundle.ts` after changing TypeScript, TSX, browser assets, or custom loaders to ensure embedded assets still bundle.
- For rendering/UI work, serve `example/` and manually verify a Markdown page, a directory page, mobile layout, theme switching, search, and print behavior as relevant.
- For export changes, inspect a generated static site through an HTTP server rather than opening it only as `file://` URLs.
- For PDF changes, render an example containing relative images, KaTeX, and Mermaid when those paths are affected.
