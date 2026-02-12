
# Noteview

Have a notebook of markdown files? Want to view it in the browser? This is a simple solution to do that.

```
$ noteview --help
Usage: mdserve [options]

Serve a directory of markdown files for easy viewing

Options:
  -d, --directory <dir>  The directory to serve
  --only-markdown        Whether to only serve markdown files
  -p, --port <port>      The port to serve on (default: "4242")
  -w, --watch            Whether to watch the directory for changes or not
  -h, --help             display help for command
```

# Features
- Sleek and elegant UI
- Code syntax highlighting
- Latex rendering for math expressions
- Sidebar file browser


# Installation
Noteview's only dependency is [bun](https://bun.sh), which you'll need to install first. After that, just:


```bash
git clone https://github.com/firesquid6/noteview
cd noteview

./build/local-install.sh
```

After that, `noteview` will be in `~/.local/bin`. You should add this to your path if you haven't already by adding:

```bash
export PATH="$PATH:$HOME/.local/bin"
```

To your `~/.bashrc` (other shells like fish or zsh will require different setup).


# To Do

- [x] proper styling
- [x] latex rendering 
- [x] sidebar
- [x] work with spaces correctly
- [x] directory listing page
- [x] the sidebar auto expands to the correct place
- [x] listener that reloads automatically
- [ ] following local links correctly
- [x] metadata handling
- [x] sort directories and files in the sidebar
- [ ] AUR package
- [ ] apt package
- [x] easy install script
- [ ] search button
- [x] mermaid rendering
- [x] better print view
- [x] theme switching

