import fs from "fs";
import path from "path";

export type Node = FileNode | DirectoryNode;

export type ContentData = {
  type: "markdown-file";
  filepath: string;
} | {
  type: "directory-listing";
  filepath: string;
} | {
  type: "static-file";
  filepath: string;
}

export type FileNode = {
  type: "file";
  name: string;
  content: ContentData;
}

export type DirectoryNode = {
  type: "directory";
  children: Node[];
  name: string;
  content: ContentData;
}


export function getFileTree(rootDirectory: string): Node {
  const indexFile = path.join(rootDirectory, "index.md");
  const children = getDirectoryChildren(rootDirectory);

  children.sort((a, b) => {
    // Directories come first
    if (a.type === "directory" && b.type === "file") {
      return -1;
    }
    if (a.type === "file" && b.type === "directory") {
      return 1;
    }
    // If both are the same type, sort alphabetically
    return a.name.localeCompare(b.name);
  });

  const content: ContentData = fs.existsSync(indexFile) ? {
    type: "markdown-file",
    filepath: indexFile,
  } : {
    type: "directory-listing",
    filepath: "root",
  }

  return {
    type: "directory",
    children,
    name: "",
    content,
  }
}

// null indicates that the file path was not found
export function matchFilePath(parts: string[], root: Node): ContentData | null {
  if (parts.length === 0) {
    return root.content;
  }

  let i = 0;
  let current = root;

  while (i < parts.length) {
    const part = parts[i]!;

    if (current.type !== "directory") {
      return null;
    }

    const next = current.children.find(n => n.name === part);

    if (next === undefined) {
      return null;
    }

    current = next;
    i++;
  }

  return current.content;
}

function getDirectoryChildren(directory: string): Node[] {
  const nodes: Node[] = [];
  for (const filename of fs.readdirSync(directory)) {
    const filepath = path.join(directory, filename);

    const stats = fs.statSync(filepath);

    if (stats.isDirectory()) {
      const children = getDirectoryChildren(filepath);
      const indexPath = path.join(filepath, "index.md");

      const content: ContentData = fs.existsSync(indexPath) ? {
        type: "markdown-file",
        filepath: indexPath,
      } : {
        type: "directory-listing",
        filepath: filepath,
      }

      children.sort((a, b) => {
        if (a.type === "directory" && b.type === "file") return -1;
        if (a.type === "file" && b.type === "directory") return 1;
        return a.name.localeCompare(b.name);
      });

      nodes.push({
        type: "directory",
        children,
        name: path.basename(filename, ".md"),
        content,
      });
    } else {
      if (filename === "index.md") {
        continue;
      }
      const ext = path.extname(filepath);
      if (ext === ".md") {
        nodes.push({
          type: "file",
          name: path.basename(filename, ".md"),
          content: {
            type: "markdown-file",
            filepath: filepath,
          }
        });
      } else {
        nodes.push({
          type: "file",
          name: filename,
          content: {
            type: "static-file",
            filepath: filepath,
          }
        });
      }
    }

  }
  return nodes;
}


export function printFilemap(node: Node, indent: string = ""): void {
  if (node.type === "directory") {
    if (node.name !== "") {
      console.log(`${indent}📁 ${node.name}/`);
      const nextIndent = indent + "  ";
      for (const child of node.children) {
        printFilemap(child, nextIndent);
      }
    } else {
      for (const child of node.children) {
        printFilemap(child, indent);
      }
    }
  } else {
    console.log(`${indent}📄 ${node.name}`);
  }
}
