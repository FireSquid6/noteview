import { MDSERVE_ROUTE, PACKAGE_FILES_PREFIX } from "../../routes";
import { Header } from "./Header";
import { Sidebar } from "./Sidebar";
import { SearchModal } from "./SearchModal";
import type { Node } from "@/filemap";

interface LayoutProps {
  filename: string;
  documentTitle?: string;
  filetree: Node;
  children: JSX.Element;
  activePath: string[];
}

export function Layout({ filename, documentTitle = filename, filetree, children, activePath }: LayoutProps): JSX.Element {
  return (
    <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title safe>Noteview - {documentTitle}</title>
        <link rel="stylesheet" href={`${PACKAGE_FILES_PREFIX}/highlight.css`} />
        <link rel="stylesheet" href={`${PACKAGE_FILES_PREFIX}/katex.css`} />
        <link rel="stylesheet" href={`${MDSERVE_ROUTE}/main.css`} />
        <script>{`try{document.documentElement.setAttribute("data-theme",localStorage.getItem("theme")||"dark")}catch{document.documentElement.setAttribute("data-theme","dark")}`}</script>
        <script defer src={`${MDSERVE_ROUTE}/main.js`} />
      </head>
      <body>
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
