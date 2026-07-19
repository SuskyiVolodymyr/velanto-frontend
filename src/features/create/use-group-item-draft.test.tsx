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

const TEXT_ITEM = {
  id: "i1",
  type: "text" as const,
  title: "Alpha",
  value: "Alpha",
};
const IMAGE_ITEM = {
  id: "i2",
  type: "image" as const,
  title: "Beta",
  value: "media/item/beta.webp",
};
const FILLED: Group = {
  id: "g1",
  name: "Group",
  items: [TEXT_ITEM, IMAGE_ITEM],
};

describe("useGroupItemDraft editing an existing item", () => {
  it("loads the item's fields into the draft when editing begins", () => {
    const { result } = renderHook(() => useGroupItemDraft(FILLED, vi.fn()), {
      wrapper,
    });

    act(() => result.current.beginEdit(TEXT_ITEM));

    expect(result.current.editingItemId).toBe("i1");
    expect(result.current.draftType).toBe("text");
    expect(result.current.draftValue).toBe("Alpha");
  });

  it("loads an image item's title and staged key", () => {
    const { result } = renderHook(() => useGroupItemDraft(FILLED, vi.fn()), {
      wrapper,
    });

    act(() => result.current.beginEdit(IMAGE_ITEM));

    expect(result.current.draftType).toBe("image");
    expect(result.current.draftTitle).toBe("Beta");
    expect(result.current.draftValue).toBe("media/item/beta.webp");
  });

  // The chip is hidden while editing rather than spliced out of the group, so
  // an edit abandoned by submitting the form keeps the original item instead of
  // silently dropping it.
  it("does not mutate the group when editing begins", () => {
    const onChange = vi.fn();
    const { result } = renderHook(() => useGroupItemDraft(FILLED, onChange), {
      wrapper,
    });

    act(() => result.current.beginEdit(TEXT_ITEM));

    expect(onChange).not.toHaveBeenCalled();
  });

  it("replaces the item in place, preserving its id and position", async () => {
    const onChange = vi.fn();
    const { result } = renderHook(() => useGroupItemDraft(FILLED, onChange), {
      wrapper,
    });

    act(() => result.current.beginEdit(TEXT_ITEM));
    act(() => result.current.setDraftValue("Alpha edited"));
    await act(async () => {
      await result.current.addItem();
    });

    expect(onChange).toHaveBeenCalledTimes(1);
    const next = onChange.mock.calls[0][0] as Group;
    expect(next.items).toHaveLength(2);
    expect(next.items[0]).toEqual({
      id: "i1",
      type: "text",
      title: "Alpha edited",
      value: "Alpha edited",
    });
    expect(next.items[1]).toEqual(IMAGE_ITEM);
  });

  it("leaves edit mode after saving", async () => {
    const { result } = renderHook(() => useGroupItemDraft(FILLED, vi.fn()), {
      wrapper,
    });

    act(() => result.current.beginEdit(TEXT_ITEM));
    act(() => result.current.setDraftValue("x"));
    await act(async () => {
      await result.current.addItem();
    });

    expect(result.current.editingItemId).toBeNull();
    expect(result.current.draftValue).toBe("");
  });

  it("shows a validation error instead of saving an emptied item", async () => {
    const onChange = vi.fn();
    const { result } = renderHook(() => useGroupItemDraft(FILLED, onChange), {
      wrapper,
    });

    act(() => result.current.beginEdit(TEXT_ITEM));
    act(() => result.current.setDraftValue("   "));
    await act(async () => {
      await result.current.addItem();
    });

    expect(onChange).not.toHaveBeenCalled();
    expect(result.current.addError).not.toBe("");
    // Still editing — the author keeps their place rather than losing the item.
    expect(result.current.editingItemId).toBe("i1");
  });

  it("discards changes on cancel and leaves the group untouched", () => {
    const onChange = vi.fn();
    const { result } = renderHook(() => useGroupItemDraft(FILLED, onChange), {
      wrapper,
    });

    act(() => result.current.beginEdit(TEXT_ITEM));
    act(() => result.current.setDraftValue("thrown away"));
    act(() => result.current.cancelEdit());

    expect(onChange).not.toHaveBeenCalled();
    expect(result.current.editingItemId).toBeNull();
    expect(result.current.draftValue).toBe("");
  });

  // Clicking a second chip mid-edit abandons the first with no change to it.
  it("switching to another item abandons the first edit unchanged", () => {
    const onChange = vi.fn();
    const { result } = renderHook(() => useGroupItemDraft(FILLED, onChange), {
      wrapper,
    });

    act(() => result.current.beginEdit(TEXT_ITEM));
    act(() => result.current.setDraftValue("never saved"));
    act(() => result.current.beginEdit(IMAGE_ITEM));

    expect(onChange).not.toHaveBeenCalled();
    expect(result.current.editingItemId).toBe("i2");
    expect(result.current.draftTitle).toBe("Beta");
  });

  it("still appends a brand-new item when not editing", async () => {
    const onChange = vi.fn();
    const { result } = renderHook(() => useGroupItemDraft(FILLED, onChange), {
      wrapper,
    });

    act(() => result.current.setDraftValue("Gamma"));
    await act(async () => {
      await result.current.addItem();
    });

    const next = onChange.mock.calls[0][0] as Group;
    expect(next.items).toHaveLength(3);
    expect(next.items[2].title).toBe("Gamma");
  });
});

describe("useGroupItemDraft carries typed text across a format switch", () => {
  it("moves text into the title when switching text -> image", () => {
    const { result } = renderHook(() => useGroupItemDraft(GROUP, vi.fn()), {
      wrapper,
    });

    act(() => result.current.setDraftValue("Some words"));
    act(() => result.current.selectType("image"));

    expect(result.current.draftTitle).toBe("Some words");
    // The staged value must NOT carry over — a text body is not an image key.
    expect(result.current.draftValue).toBe("");
  });

  it("moves the title back into the text when switching image -> text", () => {
    const { result } = renderHook(() => useGroupItemDraft(GROUP, vi.fn()), {
      wrapper,
    });

    act(() => result.current.selectType("image"));
    act(() => result.current.setDraftTitle("A caption"));
    act(() => result.current.selectType("text"));

    expect(result.current.draftValue).toBe("A caption");
    expect(result.current.draftTitle).toBe("");
  });

  it("keeps the title when switching between the two titled types", () => {
    const { result } = renderHook(() => useGroupItemDraft(GROUP, vi.fn()), {
      wrapper,
    });

    act(() => result.current.selectType("youtube"));
    act(() => result.current.setDraftTitle("Kept"));
    act(() => result.current.selectType("image"));

    expect(result.current.draftTitle).toBe("Kept");
  });

  it("does not overwrite an existing title with the text body", () => {
    const { result } = renderHook(() => useGroupItemDraft(GROUP, vi.fn()), {
      wrapper,
    });

    act(() => result.current.selectType("youtube"));
    act(() => result.current.setDraftTitle("Deliberate"));
    act(() => result.current.selectType("text"));
    act(() => result.current.selectType("image"));

    expect(result.current.draftTitle).toBe("Deliberate");
  });
});
