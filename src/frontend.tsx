import type { Node } from "./filemap";
import { Layout } from "./frontend/components/Layout";
import { NoIndexDirectory } from "./frontend/components/NoIndexDirectory";
import { Sidebar } from "./frontend/components/Sidebar";
import { DocumentContent } from "./frontend/components/DocumentContent";
import type { RenderedMarkdown } from "./renderer";

export interface ContentPageOptions {
  document: RenderedMarkdown;
  filename: string;
  filetree: Node;
  activePath: string[];
}

export interface DirectoryPageOptions {
  directoryName: string;
  filetree: Node;
  activePath: string[];
}


export function getContentPage({ document, filename, filetree, activePath }: ContentPageOptions): JSX.Element {
  return (
    <Layout
      filetree={filetree}
      filename={filename}
      documentTitle={document.mla.title ?? filename}
      activePath={activePath}
    >
      <DocumentContent document={document} filename={filename} />
    </Layout>
  )
}


export function getDirectoryPage({ filetree, directoryName, activePath }: DirectoryPageOptions): JSX.Element {
  return (
    <Layout
      filename={directoryName}
      filetree={filetree}
      activePath={activePath}
    >
      <NoIndexDirectory
        title={directoryName}
      />
    </Layout>
  )
}

export function jsxToHtml(jsx: JSX.Element): string {
  return `<!DOCTYPE HTML>\n${jsx}`;
}


export function getSidebarForPage(filetree: Node, activePath: string[]): JSX.Element {
  return (
    <Sidebar
      fileTree={filetree}
      activePath={activePath}
    />
  )
}

export function getDocumentContent(document: RenderedMarkdown, filename: string): JSX.Element {
  return <DocumentContent document={document} filename={filename} />;
}
