declare module "text:*" {
  const content: string;
  export default content;
}

declare module "font-dir:*" {
  const fonts: Record<string, string>;
  export default fonts;
}
