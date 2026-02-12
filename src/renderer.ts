import { markedHighlight } from "marked-highlight";
import Katex from "katex";
import { marked } from "marked";
import hljs from "highlight.js";
import fm from "front-matter";
// @ts-expect-error no types
import extendedLatex from "marked-extended-latex";
import markedMermaid from "@maddyguthridge/marked-mermaid";


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

export async function renderHtml(markdown: string): Promise<string> {
  const { body } = fm(markdown);
  const html = await marked(body);

  return html;
}
