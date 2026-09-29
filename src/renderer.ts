import { markedHighlight } from "marked-highlight";
import Katex from "katex";
import { marked } from "marked";
import hljs from "highlight.js";
import fm from "front-matter";
// @ts-expect-error no types
import extendedLatex from "marked-extended-latex";
import markedMermaid from "@maddyguthridge/marked-mermaid";
import markedFootnote from "marked-footnote";
import { worksCitedExtension } from "./works-cited";


const options = {
  render: (formula: string, displayMode: boolean) => { 
    const output = Katex.renderToString(formula, { 
      displayMode: displayMode,
      throwOnError: false,
    });

    return output;
  }
}
marked.use(extendedLatex(options));
marked.use(markedHighlight({
  emptyLangClass: "hljs",
  langPrefix: "hljs language-",
  highlight(code, lang) {
    const language = hljs.getLanguage(lang) ? lang : "plaintext";
    return hljs.highlight(code, { language }).value;
  }
}));
marked.use(markedMermaid())
marked.use(markedFootnote({
  refMarkers: true,
  footnoteDivider: true,
  backRefLabel: "Back to footnote reference",
}));
marked.use({ extensions: [worksCitedExtension] });

// Rewrite local .md links to match the server's extensionless routing
marked.use({
  walkTokens(token) {
    if (token.type === 'link' && token.href) {
      const href = token.href;
      if (!href.match(/^[a-z]+:\/\//i) && !href.startsWith('#')) {
        const hashIndex = href.indexOf('#');
        if (hashIndex === -1) {
          token.href = href.replace(/\.md$/, '');
        } else {
          const pathPart = href.slice(0, hashIndex).replace(/\.md$/, '');
          token.href = pathPart + href.slice(hashIndex);
        }
      }
    }
  }
});

export interface MlaMetadata {
  name?: string;
  professor?: string;
  class?: string;
  date?: string;
  title?: string;
}

export interface RenderedMarkdown {
  html: string;
  mla: MlaMetadata;
}

const mlaFields = ["name", "professor", "class", "date", "title"] as const;

function normalizeFootnoteHtml(html: string): string {
  let backRefIndex = 0;

  return html
    .replace('<h2 id="footnote-label"', '<h2 id="footnotes-label"')
    .replaceAll('aria-describedby="footnote-label"', 'aria-describedby="footnotes-label"')
    .replace(/(<sup><a id=")footnote-ref-/g, "$1footnote-reference-")
    .replace(/(<sup><a id="[^"]+" href="#)footnote-/g, "$1footnote-note-")
    .replace(/(<li id=")footnote-/g, "$1footnote-note-")
    .replace(/(<a href="#)footnote-ref-([^\"]+" data-footnote-backref)/g, "$1footnote-reference-$2")
    .replaceAll('aria-label="Back to footnote reference"', () => {
      backRefIndex += 1;
      return `aria-label="Back to footnote reference ${backRefIndex}"`;
    });
}

export async function renderHtml(markdown: string): Promise<RenderedMarkdown> {
  const { attributes, body } = fm(markdown) as { attributes: unknown; body: string };
  const html = normalizeFootnoteHtml(await marked(body));
  const mla: MlaMetadata = {};

  if (typeof attributes === "object" && attributes !== null) {
    const values = attributes as Record<string, unknown>;
    for (const field of mlaFields) {
      const value = values[field];
      if (typeof value === "string" && value.trim()) {
        mla[field] = value.trim();
      }
    }
  }

  return { html, mla };
}
