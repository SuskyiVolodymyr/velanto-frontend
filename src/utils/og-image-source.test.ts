import { describe, expect, it, vi, afterEach } from "vitest";
import sharp from "sharp";
import {
  ogImageSourceFromKey,
  OG_COVER_FIT,
  OG_AVATAR_FIT,
  OG_CARD_BACKGROUND_RGB,
} from "./og-image-source";

const BASE = "https://cdn.example.com";

function stubFetchBytes(bytes: Buffer, contentType = "image/webp") {
  // Slice to THIS buffer's own window, not `bytes.buffer.slice(0)`. A small
  // Buffer.from(...) is allocated out of Node's shared 8KB pool, so `.buffer` is
  // the whole pool and copying all of it hands sharp several kilobytes of
  // whatever earlier tests happened to allocate. The undecodable-input test then
  // passed leftover WebP bytes and got a real image back.
  const body = bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength,
  );
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: true,
      headers: { get: () => contentType },
      arrayBuffer: () => Promise.resolve(body),
    }),
  );
}

/** A tiny but valid WebP — the format Satori (next/og) cannot decode. */
function makeWebp(width = 8, height = 8): Promise<Buffer> {
  return sharp({
    create: {
      width,
      height,
      channels: 3,
      background: { r: 10, g: 200, b: 255 },
    },
  })
    .webp()
    .toBuffer();
}

/** A WebP with a fully transparent half — JPEG has no alpha to preserve. */
function makeTransparentWebp(size: number): Promise<Buffer> {
  return sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .webp()
    .toBuffer();
}

const JPEG_MAGIC = Buffer.from([0xff, 0xd8, 0xff]);

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

  it("transcodes a fetched WebP to a JPEG data URI Satori can decode", async () => {
    vi.stubEnv("NEXT_PUBLIC_MEDIA_BASE_URL", BASE);
    stubFetchBytes(await makeWebp(), "image/webp");

    const uri = await ogImageSourceFromKey("media/cover/x.webp", OG_COVER_FIT);

    expect(uri).toBeDefined();
    const { mime, bytes } = decodeDataUri(uri!);
    expect(mime).toBe("image/jpeg");
    expect(bytes.subarray(0, 3)).toEqual(JPEG_MAGIC);
  });

  // The old code re-encoded the source at FULL SIZE as a LOSSLESS PNG, turning a
  // 56KB cover into a ~794KB payload that Satori then had to base64-decode and
  // rasterise on every uncached crawler request. Downscaling to the box the card
  // actually paints is what keeps the render inside a crawler's patience.
  it("downscales an oversized source to the requested box", async () => {
    vi.stubEnv("NEXT_PUBLIC_MEDIA_BASE_URL", BASE);
    stubFetchBytes(await makeWebp(2400, 1260), "image/webp");

    const uri = await ogImageSourceFromKey("media/cover/x.webp", OG_COVER_FIT);

    const { bytes } = decodeDataUri(uri!);
    const meta = await sharp(bytes).metadata();
    expect(meta.width).toBe(OG_COVER_FIT.width);
    expect(meta.height).toBe(OG_COVER_FIT.height);
  });

  // An avatar is painted into a 224px circle, not the 1200x630 cover box. Sharing
  // one hardcoded size would letterbox-crop every profile card.
  it("honours a square target so avatars aren't cropped to the cover's aspect", async () => {
    vi.stubEnv("NEXT_PUBLIC_MEDIA_BASE_URL", BASE);
    stubFetchBytes(await makeWebp(1024, 1024), "image/webp");

    const uri = await ogImageSourceFromKey(
      "media/avatar/x.webp",
      OG_AVATAR_FIT,
    );

    const { bytes } = decodeDataUri(uri!);
    const meta = await sharp(bytes).metadata();
    expect(meta.width).toBe(OG_AVATAR_FIT.width);
    expect(meta.height).toBe(OG_AVATAR_FIT.height);
  });

  // Never upscale: a small avatar would only get heavier, not sharper.
  it("leaves a source smaller than the target box alone", async () => {
    vi.stubEnv("NEXT_PUBLIC_MEDIA_BASE_URL", BASE);
    stubFetchBytes(await makeWebp(64, 64), "image/webp");

    const uri = await ogImageSourceFromKey(
      "media/avatar/x.webp",
      OG_AVATAR_FIT,
    );

    const { bytes } = decodeDataUri(uri!);
    const meta = await sharp(bytes).metadata();
    expect(meta.width).toBe(64);
    expect(meta.height).toBe(64);
  });

  // JPEG has no alpha channel. Flattening onto the card's own background makes a
  // transparent avatar read as if it sits directly on the card, instead of the
  // black box an unflattened JPEG conversion would produce.
  it("flattens transparency onto the card background rather than black", async () => {
    vi.stubEnv("NEXT_PUBLIC_MEDIA_BASE_URL", BASE);
    stubFetchBytes(await makeTransparentWebp(128), "image/webp");

    const uri = await ogImageSourceFromKey(
      "media/avatar/x.webp",
      OG_AVATAR_FIT,
    );

    const { bytes } = decodeDataUri(uri!);
    const { data } = await sharp(bytes)
      .raw()
      .toBuffer({ resolveWithObject: true });
    // JPEG is lossy, so compare with a small tolerance rather than exactly.
    expect(data[0]).toBeCloseTo(OG_CARD_BACKGROUND_RGB.r, -1);
    expect(data[1]).toBeCloseTo(OG_CARD_BACKGROUND_RGB.g, -1);
    expect(data[2]).toBeCloseTo(OG_CARD_BACKGROUND_RGB.b, -1);
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
