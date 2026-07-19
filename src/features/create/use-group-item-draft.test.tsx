import { describe, expect, it, vi, beforeEach } from "vitest";
import type { ReactNode } from "react";
import { renderHook, act, waitFor } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import messages from "@/messages/en.json";
import { useGroupItemDraft } from "./use-group-item-draft";
import { uploadMedia } from "@/src/shared/lib/media-client";
import type { Group } from "@/src/shared/types/pack";

vi.mock("@/src/shared/lib/media-client", async () => {
  const actual = await vi.importActual<
    typeof import("@/src/shared/lib/media-client")
  >("@/src/shared/lib/media-client");
  return { ...actual, uploadMedia: vi.fn() };
});

function wrapper({ children }: { children: ReactNode }) {
  return (
    <NextIntlClientProvider locale="en" messages={messages}>
      {children}
    </NextIntlClientProvider>
  );
}

const GROUP: Group = {
  id: "g1",
  name: "Group",
  items: [],
};

function imageFile(): File {
  return new File([new Uint8Array(8)], "pic.png", { type: "image/png" });
}

beforeEach(() => vi.clearAllMocks());

describe("useGroupItemDraft image upload", () => {
  it("discards an upload that resolves after the draft type switched away from image", async () => {
    let resolveUpload!: (v: {
      key: string;
      url: string;
      byteSize: number;
    }) => void;
    vi.mocked(uploadMedia).mockReturnValue(
      new Promise((res) => {
        resolveUpload = res;
      }),
    );

    const onChange = vi.fn();
    const { result } = renderHook(() => useGroupItemDraft(GROUP, onChange), {
      wrapper,
    });

    act(() => {
      result.current.selectType("image");
    });
    // Fire the (async) upload; capture its promise without returning it from act
    // so the synchronous uploading=true flushes but the pending upload doesn't
    // leave a dangling async-act scope.
    let uploadPromise!: Promise<void>;
    act(() => {
      uploadPromise = result.current.selectImageFile(imageFile());
    });
    await waitFor(() => expect(result.current.uploading).toBe(true));

    // User switches away before the (slow) upload resolves.
    act(() => {
      result.current.selectType("text");
    });

    // The upload finally resolves — its key must NOT land in the text draft.
    await act(async () => {
      resolveUpload({ key: "media/item/late.webp", url: "u", byteSize: 8 });
      await uploadPromise;
    });

    expect(result.current.draftType).toBe("text");
    expect(result.current.draftValue).toBe("");
  });

  it("stages the uploaded key while the draft is still an image", async () => {
    vi.mocked(uploadMedia).mockResolvedValue({
      key: "media/item/ok.webp",
      url: "https://cdn/ok.webp",
      byteSize: 8,
    });

    const { result } = renderHook(() => useGroupItemDraft(GROUP, vi.fn()), {
      wrapper,
    });

    act(() => result.current.selectType("image"));
    await act(async () => {
      await result.current.selectImageFile(imageFile());
    });

    expect(result.current.draftValue).toBe("media/item/ok.webp");
    expect(result.current.imagePreviewUrl).toBe("https://cdn/ok.webp");
  });
});

describe("useGroupItemDraft crop adjust", () => {
  it("keeps the picked file and re-uploads a cropped replacement", async () => {
    vi.mocked(uploadMedia)
      .mockResolvedValueOnce({
        key: "k1",
        url: "https://cdn/k1.webp",
        byteSize: 1,
      })
      .mockResolvedValueOnce({
        key: "k2",
        url: "https://cdn/k2.webp",
        byteSize: 1,
      });

    const { result } = renderHook(() => useGroupItemDraft(GROUP, vi.fn()), {
      wrapper,
    });

    act(() => result.current.selectType("image"));
    const original = imageFile();
    await act(async () => {
      await result.current.selectImageFile(original);
    });
    expect(result.current.draftValue).toBe("k1");
    // The original file is retained so the author can re-open the cropper.
    expect(result.current.imageFile).toBe(original);

    const cropped = new File([new Uint8Array(4)], "pic.webp", {
      type: "image/webp",
    });
    await act(async () => {
      await result.current.applyCroppedImage(cropped);
    });

    expect(vi.mocked(uploadMedia)).toHaveBeenLastCalledWith(cropped, "item");
    expect(result.current.draftValue).toBe("k2");
    expect(result.current.imagePreviewUrl).toBe("https://cdn/k2.webp");
    // Original kept for re-cropping (crop again from the source, not the crop).
    expect(result.current.imageFile).toBe(original);
  });

  it("clears the picked file when the item type changes", async () => {
    vi.mocked(uploadMedia).mockResolvedValue({
      key: "k1",
      url: "https://cdn/k1.webp",
      byteSize: 1,
    });

    const { result } = renderHook(() => useGroupItemDraft(GROUP, vi.fn()), {
      wrapper,
    });

    act(() => result.current.selectType("image"));
    await act(async () => {
      await result.current.selectImageFile(imageFile());
    });
    expect(result.current.imageFile).not.toBeNull();

    act(() => result.current.selectType("text"));
    expect(result.current.imageFile).toBeNull();
  });
});
