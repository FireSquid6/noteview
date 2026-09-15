import type { RenderedMarkdown } from "../../renderer";
import { escapeHtml } from "@kitajs/html";

interface DocumentContentProps {
  document: RenderedMarkdown;
  filename: string;
}

export function DocumentContent({ document, filename }: DocumentContentProps): JSX.Element {
  const { html, mla } = document;
  const hasHeading = Boolean(mla.name || mla.professor || mla.class || mla.date || mla.title);
  const documentTitle = mla.title ?? filename;

  return (
    <article class="mla-document" data-document-title={escapeHtml(documentTitle)}>
      {hasHeading && (
        <header class="mla-heading">
          <div class="mla-heading-lines">
            {mla.name && <p safe>{mla.name}</p>}
            {mla.professor && <p safe>{mla.professor}</p>}
            {mla.class && <p safe>{mla.class}</p>}
            {mla.date && <p safe>{mla.date}</p>}
          </div>
          {mla.title && <p class="mla-title" safe>{mla.title}</p>}
        </header>
      )}
      <div class="markdown-body">{html}</div>
    </article>
  );
}
