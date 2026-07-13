import { describe, expect, it, vi, beforeEach } from "vitest";
import { apiClient } from "@/src/shared/lib/api-client";
import { uploadMedia } from "@/src/shared/lib/media-client";

vi.mock("@/src/shared/lib/api-client", () => ({
  apiClient: {
    postForm: vi.fn(),
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("uploadMedia", () => {
  it("POSTs multipart form data with the file and kind to /media", async () => {
    vi.mocked(apiClient.postForm).mockResolvedValue({
      key: "media/item/abc.webp",
      url: "https://cdn.example.com/media/item/abc.webp",
      byteSize: 1234,
    });
    const file = new File(["x"], "poster.png", { type: "image/png" });

    const result = await uploadMedia(file, "item");

    expect(apiClient.postForm).toHaveBeenCalledWith(
      "/media",
      expect.any(FormData),
    );
    const form = vi.mocked(apiClient.postForm).mock.calls[0][1] as FormData;
    expect(form.get("file")).toBe(file);
    expect(form.get("kind")).toBe("item");
    expect(result).toEqual({
      key: "media/item/abc.webp",
      url: "https://cdn.example.com/media/item/abc.webp",
      byteSize: 1234,
    });
  });

  it("propagates the kind for non-item uploads", async () => {
    vi.mocked(apiClient.postForm).mockResolvedValue({
      key: "media/avatar/abc.webp",
      url: "https://cdn.example.com/media/avatar/abc.webp",
      byteSize: 10,
    });
    const file = new File(["x"], "me.jpg", { type: "image/jpeg" });

    await uploadMedia(file, "avatar");

    const form = vi.mocked(apiClient.postForm).mock.calls[0][1] as FormData;
    expect(form.get("kind")).toBe("avatar");
  });
});
