import { createHash } from "crypto";
import { gzipSync } from "zlib";

export interface StaticAsset {
  content: Uint8Array<ArrayBuffer>;
  gzip?: Uint8Array<ArrayBuffer>;
  type: string;
  etag: string;
}

function acceptsGzip(request: Request): boolean {
  const encodings = new Map(
    request.headers
      .get("accept-encoding")
      ?.split(",")
      .map((value) => {
        const [encoding = "", ...parameters] = value.trim().split(";");
        const quality = parameters
          .map((parameter) => parameter.trim().match(/^q=(.+)$/i)?.[1])
          .find(Boolean);
        return [encoding.toLowerCase(), quality === undefined ? 1 : Number(quality)] as const;
      }) ?? []
  );
  const quality = encodings.get("gzip") ?? encodings.get("*") ?? 0;
  return quality > 0;
}

function normalizeEtag(value: string): string {
  return value.replace(/^W\//, "");
}

function toBytes(content: string | Buffer): Uint8Array<ArrayBuffer> {
  return Uint8Array.from(Buffer.isBuffer(content) ? content : Buffer.from(content));
}

export function prepareAsset(content: string | Buffer, type: string): StaticAsset {
  const bytes = toBytes(content);
  const gzip = Uint8Array.from(gzipSync(bytes));
  const hash = createHash("sha256").update(bytes).digest("base64url");
  return {
    content: bytes,
    gzip: gzip.byteLength < bytes.byteLength ? gzip : undefined,
    type,
    etag: `W/"${hash}"`,
  };
}

export function staticResponse(request: Request, asset: StaticAsset): Response {
  const headers = new Headers({
    "cache-control": "public, max-age=0, must-revalidate",
    "content-type": asset.type,
    etag: asset.etag,
    vary: "Accept-Encoding",
  });
  const validators = request.headers.get("if-none-match")?.split(",").map((value) => value.trim());

  if (validators?.some((value) => value === "*" || normalizeEtag(value) === normalizeEtag(asset.etag))) {
    return new Response(null, { status: 304, headers });
  }

  if (acceptsGzip(request) && asset.gzip) {
    headers.set("content-encoding", "gzip");
    headers.set("content-length", asset.gzip.byteLength.toString());
    return new Response(asset.gzip, { headers });
  }

  headers.set("content-length", asset.content.byteLength.toString());
  return new Response(asset.content, { headers });
}

export function textResponse(request: Request, content: string, type: string): Response {
  const bytes = toBytes(content);
  const headers = new Headers({
    "cache-control": "no-cache",
    "content-type": type,
    vary: "Accept-Encoding",
  });

  if (acceptsGzip(request)) {
    const gzip = Uint8Array.from(gzipSync(bytes));
    if (gzip.byteLength < bytes.byteLength) {
      headers.set("content-encoding", "gzip");
      headers.set("content-length", gzip.byteLength.toString());
      return new Response(gzip, { headers });
    }
  }

  headers.set("content-length", bytes.byteLength.toString());
  return new Response(bytes, { headers });
}
