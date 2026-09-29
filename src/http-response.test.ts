import { describe, expect, test } from "bun:test";
import { gunzipSync } from "zlib";
import { prepareAsset, staticResponse, textResponse } from "./http-response";

describe("staticResponse", () => {
  const content = "compressible response ".repeat(100);
  const asset = prepareAsset(content, "text/plain");

  test("serves gzip with cache headers", async () => {
    const request = new Request("http://localhost/file", {
      headers: { "accept-encoding": "br, gzip" },
    });
    const response = staticResponse(request, asset);
    const body = gunzipSync(Buffer.from(await response.arrayBuffer())).toString();

    expect(response.status).toBe(200);
    expect(response.headers.get("content-encoding")).toBe("gzip");
    expect(response.headers.get("cache-control")).toBe("public, max-age=0, must-revalidate");
    expect(response.headers.get("vary")).toBe("Accept-Encoding");
    expect(body).toBe(content);
  });

  test("honors disabled gzip encoding", async () => {
    const request = new Request("http://localhost/file", {
      headers: { "accept-encoding": "gzip;q=0.00" },
    });
    const response = staticResponse(request, asset);

    expect(response.headers.get("content-encoding")).toBeNull();
    expect(await response.text()).toBe(content);
  });

  test("returns not modified for a matching validator", () => {
    const request = new Request("http://localhost/file", {
      headers: { "if-none-match": `"another", ${asset.etag.replace("W/", "")}` },
    });
    const response = staticResponse(request, asset);

    expect(response.status).toBe(304);
    expect(response.body).toBeNull();
  });

  test("uses gzip when allowed by a wildcard", () => {
    const request = new Request("http://localhost/file", {
      headers: { "accept-encoding": "*;q=1, identity;q=0" },
    });
    const response = staticResponse(request, asset);

    expect(response.headers.get("content-encoding")).toBe("gzip");
  });
});

test("textResponse compresses dynamic text without making it cacheable", async () => {
  const content = "rendered note ".repeat(100);
  const response = textResponse(
    new Request("http://localhost/note", { headers: { "accept-encoding": "gzip" } }),
    content,
    "text/html; charset=utf-8"
  );

  expect(response.headers.get("cache-control")).toBe("no-cache");
  expect(response.headers.get("content-encoding")).toBe("gzip");
  expect(gunzipSync(Buffer.from(await response.arrayBuffer())).toString()).toBe(content);
});
