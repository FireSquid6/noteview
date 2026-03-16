
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
