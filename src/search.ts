import fs from "fs";
import type { Node } from "./filemap";

interface ContentMatch {
  lineNumber: number;
  lineContent: string;
  matchStart: number;
  matchEnd: number;
}

export interface SearchResult {
  type: "filename" | "content";
  displayPath: string;
  filename: string;
  matches?: ContentMatch[];
}

export function searchFileTree(query: string, root: Node, maxResults = 20): SearchResult[] {
  if (!query || query.length < 2) return [];

  const results: SearchResult[] = [];
  const lowerQuery = query.toLowerCase();

  function traverse(node: Node, pathParts: string[]) {
    if (results.length >= maxResults) return;

    const currentParts = node.name ? [...pathParts, node.name] : pathParts;
    const displayPath = "/" + currentParts.join("/");

    // Check filename match
    if (node.name && node.name.toLowerCase().includes(lowerQuery)) {
      results.push({
        type: "filename",
        displayPath,
        filename: node.name,
      });
    }

    // Check file content match
    if (results.length < maxResults && node.content.type === "markdown-file") {
      try {
        const text = fs.readFileSync(node.content.filepath, "utf-8");
        const lines = text.split("\n");
        const matches: ContentMatch[] = [];

        for (let i = 0; i < lines.length && matches.length < 3; i++) {
          const line = lines[i]!;
          const lowerLine = line.toLowerCase();
          const idx = lowerLine.indexOf(lowerQuery);
          if (idx === -1) continue;

          // Extract ~50 char context on each side
          const contextStart = Math.max(0, idx - 50);
          const contextEnd = Math.min(line.length, idx + query.length + 50);
          const lineContent = line.slice(contextStart, contextEnd);
          const matchStart = idx - contextStart;
          const matchEnd = matchStart + query.length;

          matches.push({
            lineNumber: i + 1,
            lineContent,
            matchStart,
            matchEnd,
          });
        }

        if (matches.length > 0) {
          // Don't add a duplicate entry if we already added a filename match for this node
          const alreadyAdded = results.some(
            (r) => r.displayPath === displayPath && r.type === "filename"
          );
          if (alreadyAdded) {
            // Attach content matches to the existing filename result
            const existing = results.find(
              (r) => r.displayPath === displayPath && r.type === "filename"
            );
            existing!.matches = matches;
          } else {
            results.push({
              type: "content",
              displayPath,
              filename: node.name,
              matches,
            });
          }
        }
      } catch {
        // File unreadable, skip
      }
    }

    if (node.type === "directory") {
      for (const child of node.children) {
        if (results.length >= maxResults) break;
        traverse(child, currentParts);
      }
    }
  }

  traverse(root, []);
  return results;
}
