declare module "text:*" {
  const content: string;
  export default content;
}

declare module "font-dir:*" {
  const fonts: Record<string, string>;
  export default fonts;
}

declare module "@citation-js/core" {
  export class Cite {
    constructor(data: unknown);
    format(type: string, options: Record<string, unknown>): string;
  }

  export const plugins: {
    config: {
      get(name: string): {
        styles: {
          add(name: string, style: string): void;
        };
      };
    };
  };
}

declare module "@citation-js/plugin-csl";
