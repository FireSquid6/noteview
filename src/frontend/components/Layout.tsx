import { MDSERVE_ROUTE, PACKAGE_FILES_PREFIX } from "../../server";
import { Header } from "./Header";
import { Sidebar } from "./Sidebar";
import { SearchModal } from "./SearchModal";
import type { Node } from "@/filemap";

interface LayoutProps {
  filename: string;
  filetree: Node;
  children: JSX.Element;
  activePath: string[];
}

export function Layout({ filename, filetree, children, activePath }: LayoutProps): JSX.Element {
  return (
    <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Noteview - {filename}</title>
        <link rel="stylesheet" href={`${PACKAGE_FILES_PREFIX}/highlight.css`} />
        <link rel="stylesheet" href={`${PACKAGE_FILES_PREFIX}/katex.css`} />
        <link rel="stylesheet" href={`${MDSERVE_ROUTE}/main.css`} />
        <script src={`${PACKAGE_FILES_PREFIX}/htmx.js`} />
        <script src={`${PACKAGE_FILES_PREFIX}/mermaid.js`} />
        <script src={`${PACKAGE_FILES_PREFIX}/katex.js`} />
        <script src={`${MDSERVE_ROUTE}/main.js`} />
      </head>
      <body hx-boost>
        <div class="app-layout">
          <Header filename={filename} />
          <div class="main-layout">
            <div id="sidebar-container">
              <Sidebar fileTree={filetree} activePath={activePath} />
            </div>
            <div class="content-wrapper">
              <main id="content-container" class="content">
                {children}
              </main>
            </div>
          </div>
          <SearchModal />
        </div>
      </body>
    </html>
  );
}
