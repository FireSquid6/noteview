#!/usr/bin/env bash
set -e

REPO="firesquid6/noteview"
BIN_NAME="noteview"
INSTALL_DIR="$HOME/.local/bin"

# Detect OS and architecture
OS="$(uname -s)"
ARCH="$(uname -m)"

case "$OS" in
  Linux)
    case "$ARCH" in
      x86_64)  ASSET="notesview-linux-x64" ;;
      aarch64) ASSET="notesview-linux-arm64" ;;
      *) echo "Unsupported architecture: $ARCH"; exit 1 ;;
    esac
    ;;
  Darwin)
    case "$ARCH" in
      x86_64)  ASSET="notesview-macos-x64" ;;
      arm64)   ASSET="notesview-macos-arm64" ;;
      *) echo "Unsupported architecture: $ARCH"; exit 1 ;;
    esac
    ;;
  MINGW*|MSYS*|CYGWIN*)
    ASSET="notesview-windows-x64.exe"
    BIN_NAME="noteview.exe"
    ;;
  *) echo "Unsupported OS: $OS"; exit 1 ;;
esac

# Fetch the download URL for the asset from the latest release
echo "Fetching latest release info..."
DOWNLOAD_URL="$(curl -fsSL "https://api.github.com/repos/${REPO}/releases/latest" \
  | grep "browser_download_url" \
  | grep "${ASSET}" \
  | head -1 \
  | cut -d '"' -f 4)"

if [ -z "$DOWNLOAD_URL" ]; then
  echo "Error: could not find asset \"${ASSET}\" in the latest release."
  exit 1
fi

mkdir -p "$INSTALL_DIR"

echo "Downloading $ASSET..."
curl -fsSL "$DOWNLOAD_URL" -o "$INSTALL_DIR/$BIN_NAME"
chmod +x "$INSTALL_DIR/$BIN_NAME"

echo ""
echo "Installed noteview to $INSTALL_DIR/$BIN_NAME"

# Warn if the install dir isn't on PATH
case ":$PATH:" in
  *":$INSTALL_DIR:"*) ;;
  *) echo "Note: $INSTALL_DIR is not in your PATH. Add it to your shell config to use noteview." ;;
esac
