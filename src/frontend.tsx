import type { Node } from "./filemap";
import { Layout } from "./frontend/components/Layout";
import { NoIndexDirectory } from "./frontend/components/NoIndexDirectory";
import { Sidebar } from "./frontend/components/Sidebar";

export interface ContentPageOptions {
  content: string;
  filename: string;
  filetree: Node;
  activePath: string[];
  customThemeHref?: string;
}

export interface DirectoryPageOptions {
  directoryName: string;
  filetree: Node;
  activePath: string[];
  customThemeHref?: string;
}


export function getContentPage({ content, filename, filetree, activePath, customThemeHref }: ContentPageOptions): JSX.Element {
  return (
    <Layout
      filetree={filetree}
      filename={filename}
      activePath={activePath}
      customThemeHref={customThemeHref}
    >
      {content}
    </Layout>
  )
}


export function getDirectoryPage({ filetree, directoryName, activePath, customThemeHref }: DirectoryPageOptions): JSX.Element {
  return (
    <Layout
      filename={directoryName}
      filetree={filetree}
      activePath={activePath}
      customThemeHref={customThemeHref}
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
