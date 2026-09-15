
# Noteview

A local markdown notebook viewer and static site exporter. Point it at a directory of `.md` files and get a clean, fully-featured reading experience in the browser — or export the whole thing to a static site or PDF.

## Features

- Sleek dark/light theme UI with a collapsible sidebar file browser
- Renders LaTeX math expressions with KaTeX (`$inline$` and `$$display$$`)
- Mermaid diagram support (flowcharts, sequence diagrams, etc.)
- Syntax-highlighted code blocks via highlight.js
- Full-text search across all files
- Live reload when files change (`--watch`)
- Local `.md` links work automatically — no extension required
- Front matter support (YAML metadata is stripped before rendering)
- Optional MLA document formatting using front matter metadata
- GFM-style footnotes with linked references and backlinks
- Structured MLA works cited sections using `<workscited>` blocks
- Export a directory to a self-contained static website
- Export a single file to PDF


## Installation

```bash
curl -fsSL https://raw.githubusercontent.com/firesquid6/noteview/main/install.sh | bash
```

This downloads the correct binary for your OS and architecture from the latest release and places it in `~/.local/bin`. Add that to your PATH if needed:

```bash
# bash / zsh
export PATH="$PATH:$HOME/.local/bin"
```

Fish users: `fish_add_path ~/.local/bin`

### Build from source

Requires [bun](https://bun.sh):

```bash
git clone https://github.com/firesquid6/noteview
cd noteview
./build/local-install.sh
```


## Usage

### Serve a directory

```bash
noteview serve -d ./my-notes
```

Open `http://localhost:4242` in your browser. The sidebar lists all markdown files in the directory tree. Options:

| Flag | Description |
|------|-------------|
| `-d, --directory <dir>` | Directory to serve (required) |
| `-p, --port <port>` | Port to listen on (default: `4242`) |
| `-w, --watch` | Reload automatically when files change |
| `--only-markdown` | Hide non-markdown files from the sidebar |

### Export to a static site

```bash
noteview export -i ./my-notes -o ./site
```

Walks the entire directory tree and produces a fully self-contained static website in the output directory. Every markdown file becomes an `index.html` inside a folder matching its path, preserving the same extensionless URL structure used by the dev server. Static assets (images, etc.) are copied as-is. All CSS, JS, and fonts are bundled into the output so no external dependencies are needed at runtime.

The output can be served by any static host (Nginx, GitHub Pages, Netlify, etc.).

> The output directory must not be inside the input directory.

### Export a single file to PDF

```bash
noteview to-pdf -i ./my-notes/report.md -o ./report.pdf
```

Renders the markdown file through a headless browser so that LaTeX, Mermaid diagrams, syntax-highlighted code, and images all appear exactly as they do in the browser. The output directory is created automatically if it does not exist.

Pass `--mla` to format the PDF for US Letter paper with one-inch margins:

```bash
noteview to-pdf -i ./my-notes/report.md -o ./report.pdf --mla
```

### MLA formatting

Use the `MLA` button in the site header to apply MLA-style typography, spacing, margins, and document metadata independently of the light or dark color theme. The setting persists between pages.

MLA metadata comes from these optional front matter fields. Quote the values so they remain strings:

```markdown
---
name: "Jordan Lee"
professor: "Professor Morgan"
class: "English 101"
date: "2 September 2026"
title: "Memory and Place in Modern Fiction"
---
```

Missing or invalid fields are omitted. The `title` field is also used for the browser and PDF document title, while the application header continues to show the filename.

### Footnotes

Add a reference with `[^label]` and define its content with a matching `[^label]:` line:

```markdown
Memory changes as it is recalled.[^memory]

[^memory]: This note can contain **formatted text**, links, and other Markdown.
```

References are numbered in reading order, and every note includes a link back to the corresponding reference. Reusing a label creates multiple backlinks. Indent continuation lines by four spaces to include multiple paragraphs, lists, blockquotes, or code blocks in a note. Notes are collected at the end of the rendered document in served pages, static exports, and PDFs.

### Works cited

Add a `<workscited>` block to render an alphabetized MLA works cited section in both normal and MLA display modes. The block contains a YAML list using a supported subset of [CSL-JSON](https://citeproc-js.readthedocs.io/en/latest/csl-json/markup.html):

```markdown
<workscited>
- id: morrison-beloved
  type: book
  author:
    - family: Morrison
      given: Toni
  title: Beloved
  publisher: Vintage
  issued:
    date-parts:
      - [2004]
- id: goldman-transport
  type: article-journal
  author:
    - family: Goldman
      given: Anne
  title: Questions of Transport
  container-title: The Georgia Review
  volume: "64"
  issue: "1"
  page: 69-88
  issued:
    date-parts:
      - [2010]
  URL: https://www.jstor.org/stable/41403188
</workscited>
```

Each entry requires a unique `id`, a `type`, and a `title`. Supported types are `book`, `chapter`, `article-journal`, `article-magazine`, `article-newspaper`, `webpage`, `report`, `motion_picture`, and `thesis`.

Optional scalar fields are `container-title`, `publisher`, `publisher-place`, `edition`, `volume`, `issue`, `page`, `URL`, `DOI`, `title-short`, and `genre`. The `author`, `editor`, and `translator` fields contain lists of names. Personal names use `family` and optional `given`, `suffix`, and particle fields; organizations use `literal`:

```yaml
author:
  - literal: World Health Organization
```

The `issued` and `accessed` fields accept `date-parts` containing `[year]`, `[year, month]`, or `[year, month, day]`. They can instead contain a `literal` string for dates that cannot be represented numerically. Invalid data produces a visible authoring error rather than silently emitting an incorrect bibliography.


## To Do

- [x] proper styling
- [x] latex rendering
- [x] sidebar
- [x] work with spaces correctly
- [x] directory listing page
- [x] the sidebar auto expands to the correct place
- [x] listener that reloads automatically
- [x] following local links correctly
- [x] metadata handling
- [x] sort directories and files in the sidebar
- [x] easy install script
- [x] search button
- [x] mermaid rendering
- [x] better print view
- [x] theme switching
- [x] static site export
- [x] PDF export
