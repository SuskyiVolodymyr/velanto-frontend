import { describe, expect, it, vi, afterEach } from "vitest";
import sharp from "sharp";
import { ogImageSourceFromKey } from "./og-image-source";

const BASE = "https://cdn.example.com";

function stubFetchBytes(bytes: Buffer, contentType = "image/webp") {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: true,
      headers: { get: () => contentType },
      arrayBuffer: () => Promise.resolve(bytes.buffer.slice(0)),
    }),
  );
}

/** A tiny but valid WebP — the format Satori (next/og) cannot decode. */
function makeWebp(): Promise<Buffer> {
  return sharp({
    create: {
      width: 8,
      height: 8,
      channels: 3,
      background: { r: 10, g: 200, b: 255 },
    },
  })
    .webp()
    .toBuffer();
}

const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47]);

function decodeDataUri(uri: string): { mime: string; bytes: Buffer } {
  const match = /^data:([^;]+);base64,(.+)$/.exec(uri);
  if (!match) throw new Error(`not a data URI: ${uri.slice(0, 32)}`);
  return { mime: match[1], bytes: Buffer.from(match[2], "base64") };
}

describe("ogImageSourceFromKey", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("transcodes a fetched WebP to a PNG data URI Satori can decode", async () => {
    vi.stubEnv("NEXT_PUBLIC_MEDIA_BASE_URL", BASE);
    stubFetchBytes(await makeWebp(), "image/webp");

    const uri = await ogImageSourceFromKey("media/cover/x.webp");

    expect(uri).toBeDefined();
    const { mime, bytes } = decodeDataUri(uri!);
    expect(mime).toBe("image/png");
    expect(bytes.subarray(0, 4)).toEqual(PNG_MAGIC);
  });

  it("returns undefined for a missing key", async () => {
    expect(await ogImageSourceFromKey(null)).toBeUndefined();
    expect(await ogImageSourceFromKey(undefined)).toBeUndefined();
  });

  it("returns undefined when no media base URL is configured (non-absolute)", async () => {
    vi.stubEnv("NEXT_PUBLIC_MEDIA_BASE_URL", "");
    expect(await ogImageSourceFromKey("media/cover/x.webp")).toBeUndefined();
  });

  it("returns undefined when the fetch is non-OK", async () => {
    vi.stubEnv("NEXT_PUBLIC_MEDIA_BASE_URL", BASE);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false }));
    expect(await ogImageSourceFromKey("media/cover/x.webp")).toBeUndefined();
  });

  it("returns undefined when the fetch throws", async () => {
    vi.stubEnv("NEXT_PUBLIC_MEDIA_BASE_URL", BASE);
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network")));
    expect(await ogImageSourceFromKey("media/cover/x.webp")).toBeUndefined();
  });

  it("degrades to undefined (not a throw) when the bytes can't be decoded", async () => {
    vi.stubEnv("NEXT_PUBLIC_MEDIA_BASE_URL", BASE);
    stubFetchBytes(Buffer.from("this is not an image"), "image/webp");
    expect(await ogImageSourceFromKey("media/cover/x.webp")).toBeUndefined();
  });
});
