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
