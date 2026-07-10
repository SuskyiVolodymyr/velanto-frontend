# Tag Picker Modal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the inline tag-chip row in `CreatePackForm` and `HomeFeed` with a checkbox modal, now that `PACK_TAGS` has grown from 16 to 31 entries (velanto-backend#54, merged) — an inline row of 31 chips is unwieldy.

**Architecture:** A new generic `Modal` primitive (backdrop, ESC-to-close, click-outside-to-close) is this codebase's first modal/dialog component — build it reusably since upcoming work (ban-duration modal, report detail modal) will also want it. A `TagPickerModal` built on top of it renders `PACK_TAGS` as checkboxes. Both consumers (`CreatePackForm`, `HomeFeed`) swap their inline chip row for a button that opens the modal.

**Tech Stack:** Next.js App Router, React 19, Tailwind v4, Vitest + React Testing Library.

**Reference:** velanto-frontend#53, velanto-backend#54 (merged).

---

### Task 1: `Modal` primitive

**Files:**

- Create: `src/shared/components/Modal.tsx`
- Test: `src/shared/components/Modal.test.tsx`

- [ ] **Step 1: Write the failing tests**

Create `src/shared/components/Modal.test.tsx`:

```tsx
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Modal } from "./Modal";

describe("Modal", () => {
  it("renders its children when open", () => {
    render(
      <Modal open onClose={vi.fn()} title="Test modal">
        <p>Modal content</p>
      </Modal>,
    );
    expect(screen.getByText("Modal content")).toBeInTheDocument();
  });

  it("renders nothing when closed", () => {
    render(
      <Modal open={false} onClose={vi.fn()} title="Test modal">
        <p>Modal content</p>
      </Modal>,
    );
    expect(screen.queryByText("Modal content")).not.toBeInTheDocument();
  });

  it("renders the title as a heading", () => {
    render(
      <Modal open onClose={vi.fn()} title="Test modal">
        <p>Modal content</p>
      </Modal>,
    );
    expect(
      screen.getByRole("heading", { name: "Test modal" }),
    ).toBeInTheDocument();
  });

  it("calls onClose when the close button is clicked", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(
      <Modal open onClose={onClose} title="Test modal">
        <p>Modal content</p>
      </Modal>,
    );
    await user.click(screen.getByRole("button", { name: "Close" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("calls onClose when the backdrop is clicked", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(
      <Modal open onClose={onClose} title="Test modal">
        <p>Modal content</p>
      </Modal>,
    );
    await user.click(screen.getByTestId("modal-backdrop"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("does not call onClose when the dialog content itself is clicked", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(
      <Modal open onClose={onClose} title="Test modal">
        <p>Modal content</p>
      </Modal>,
    );
    await user.click(screen.getByText("Modal content"));
    expect(onClose).not.toHaveBeenCalled();
  });

  it("calls onClose when Escape is pressed", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(
      <Modal open onClose={onClose} title="Test modal">
        <p>Modal content</p>
      </Modal>,
    );
    await user.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("has role=dialog and aria-modal=true", () => {
    render(
      <Modal open onClose={vi.fn()} title="Test modal">
        <p>Modal content</p>
      </Modal>,
    );
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAttribute("aria-modal", "true");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- Modal.test.tsx`
Expected: FAIL — `Cannot find module './Modal'`.

- [ ] **Step 3: Implement `Modal`**

Create `src/shared/components/Modal.tsx`:

```tsx
"use client";

import { useEffect, type ReactNode } from "react";
import { cn } from "@/src/shared/lib/cn";
import { Text } from "@/src/shared/components/Text";

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  className?: string;
}

export function Modal({
  open,
  onClose,
  title,
  children,
  className,
}: ModalProps) {
  useEffect(() => {
    if (!open) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      data-testid="modal-backdrop"
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        onClick={(event) => event.stopPropagation()}
        className={cn(
          "flex max-h-[85vh] w-full max-w-md flex-col rounded-[15px] border border-border bg-surface p-5",
          className,
        )}
      >
        <div className="mb-4 flex items-center justify-between">
          <Text as="h2" id="modal-title" variant="title" className="text-lg">
            {title}
          </Text>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-[9px] px-2 py-1 text-foreground-secondary transition-colors hover:text-foreground"
          >
            ✕
          </button>
        </div>
        <div className="overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}
```

Check `src/shared/components/Text.tsx` first to confirm it accepts an `id` prop passthrough and an `as="h2"` prop — if its prop types don't already spread extra HTML attributes onto the rendered element, adjust the `id="modal-title"` placement accordingly (e.g. move the `id` onto a wrapping element) so `aria-labelledby="modal-title"` resolves correctly.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- Modal.test.tsx`
Expected: PASS.

- [ ] **Step 5: Typecheck and lint**

Run: `npm run typecheck && npm run lint`
Expected: both PASS.

- [ ] **Step 6: Commit**

```bash
git add src/shared/components/Modal.tsx src/shared/components/Modal.test.tsx
git commit -m "feat: add reusable Modal primitive"
```

---

### Task 2: `TagPickerModal`

**Files:**

- Create: `src/shared/components/TagPickerModal.tsx`
- Test: `src/shared/components/TagPickerModal.test.tsx`

- [ ] **Step 1: Write the failing tests**

Create `src/shared/components/TagPickerModal.test.tsx`:

```tsx
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TagPickerModal } from "./TagPickerModal";

describe("TagPickerModal", () => {
  it("renders every tag as a checkbox", () => {
    render(
      <TagPickerModal
        open
        onClose={vi.fn()}
        selected={[]}
        onChange={vi.fn()}
      />,
    );
    expect(screen.getByRole("checkbox", { name: "Anime" })).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "Memes" })).toBeInTheDocument();
  });

  it("checks the boxes for already-selected tags", () => {
    render(
      <TagPickerModal
        open
        onClose={vi.fn()}
        selected={["Anime", "Gaming"]}
        onChange={vi.fn()}
      />,
    );
    expect(screen.getByRole("checkbox", { name: "Anime" })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: "Gaming" })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: "Music" })).not.toBeChecked();
  });

  it("calls onChange with the tag added when an unchecked box is clicked", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <TagPickerModal
        open
        onClose={vi.fn()}
        selected={["Anime"]}
        onChange={onChange}
      />,
    );
    await user.click(screen.getByRole("checkbox", { name: "Music" }));
    expect(onChange).toHaveBeenCalledWith(["Anime", "Music"]);
  });

  it("calls onChange with the tag removed when a checked box is clicked", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <TagPickerModal
        open
        onClose={vi.fn()}
        selected={["Anime", "Music"]}
        onChange={onChange}
      />,
    );
    await user.click(screen.getByRole("checkbox", { name: "Anime" }));
    expect(onChange).toHaveBeenCalledWith(["Music"]);
  });

  it("shows a live selected count", () => {
    render(
      <TagPickerModal
        open
        onClose={vi.fn()}
        selected={["Anime", "Music"]}
        onChange={vi.fn()}
      />,
    );
    expect(screen.getByText("2 selected")).toBeInTheDocument();
  });

  it("disables unchecked boxes once maxTags is reached", () => {
    render(
      <TagPickerModal
        open
        onClose={vi.fn()}
        selected={["Anime", "Music"]}
        onChange={vi.fn()}
        maxTags={2}
      />,
    );
    expect(screen.getByRole("checkbox", { name: "Gaming" })).toBeDisabled();
    expect(screen.getByRole("checkbox", { name: "Anime" })).not.toBeDisabled();
  });

  it("does not disable any box when maxTags is not provided", () => {
    render(
      <TagPickerModal
        open
        onClose={vi.fn()}
        selected={["Anime", "Music"]}
        onChange={vi.fn()}
      />,
    );
    expect(screen.getByRole("checkbox", { name: "Gaming" })).not.toBeDisabled();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- TagPickerModal.test.tsx`
Expected: FAIL — `Cannot find module './TagPickerModal'`.

- [ ] **Step 3: Implement `TagPickerModal`**

Create `src/shared/components/TagPickerModal.tsx`:

```tsx
"use client";

import { PACK_TAGS } from "@/src/shared/types/pack";
import type { PackTag } from "@/src/shared/types/pack";
import { Modal } from "@/src/shared/components/Modal";
import { Text } from "@/src/shared/components/Text";

export interface TagPickerModalProps {
  open: boolean;
  onClose: () => void;
  selected: PackTag[];
  onChange: (tags: PackTag[]) => void;
  /** When set, unchecked boxes disable once `selected.length` reaches this cap. */
  maxTags?: number;
}

export function TagPickerModal({
  open,
  onClose,
  selected,
  onChange,
  maxTags,
}: TagPickerModalProps) {
  function toggle(tag: PackTag) {
    const isSelected = selected.includes(tag);
    if (isSelected) {
      onChange(selected.filter((t) => t !== tag));
    } else {
      onChange([...selected, tag]);
    }
  }

  const atCap = maxTags !== undefined && selected.length >= maxTags;

  return (
    <Modal open={open} onClose={onClose} title="Select tags">
      <Text variant="tertiary" className="mb-3 text-xs">
        {selected.length} selected{maxTags !== undefined ? ` / ${maxTags}` : ""}
      </Text>
      <div className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-3">
        {PACK_TAGS.map((tag) => {
          const isSelected = selected.includes(tag);
          const disabled = !isSelected && atCap;
          return (
            <label
              key={tag}
              className="flex items-center gap-2 text-sm text-foreground-secondary"
            >
              <input
                type="checkbox"
                checked={isSelected}
                disabled={disabled}
                onChange={() => toggle(tag)}
                className="h-4 w-4 rounded border-border accent-acc"
              />
              {tag}
            </label>
          );
        })}
      </div>
    </Modal>
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- TagPickerModal.test.tsx`
Expected: PASS.

- [ ] **Step 5: Typecheck and lint**

Run: `npm run typecheck && npm run lint`
Expected: both PASS.

- [ ] **Step 6: Commit**

```bash
git add src/shared/components/TagPickerModal.tsx src/shared/components/TagPickerModal.test.tsx
git commit -m "feat: add TagPickerModal"
```

---

### Task 3: Wire into `CreatePackForm`

**Files:**

- Modify: `src/features/create/CreatePackForm.tsx`
- Modify: `src/features/create/CreatePackForm.test.tsx` (or the equivalent existing test file — locate it first; if none exists, skip updating tests but still add new ones per Step 1 below)

- [ ] **Step 1: Locate the existing test file and current tag-chip test coverage**

Run: `find src/features/create -iname "*.test.tsx"` (or check `CreatePackForm.test.tsx` directly) to see what's already covered for tag selection, so you know what to adapt vs. what to add.

- [ ] **Step 2: Replace the inline chip row with a button + `TagPickerModal`**

In `src/features/create/CreatePackForm.tsx`:

- Add `import { TagPickerModal } from "@/src/shared/components/TagPickerModal";`
- Add local state: `const [tagPickerOpen, setTagPickerOpen] = useState(false);`
- Replace the `<div className="flex flex-wrap gap-2">{PACK_TAGS.map(...)}</div>` block (around line 283) with a button that opens the modal, e.g.:

```tsx
<Button
  type="button"
  variant="secondary"
  onClick={() => setTagPickerOpen(true)}
>
  {tags.length === 0 ? "Select tags" : `${tags.length} tag${tags.length === 1 ? "" : "s"} selected`}
</Button>
<TagPickerModal
  open={tagPickerOpen}
  onClose={() => setTagPickerOpen(false)}
  selected={tags}
  onChange={setTags}
  maxTags={MAX_TAGS}
/>
```

Keep the existing `{tags.length}/{MAX_TAGS}` count text above it if it reads well next to the button, or fold it into the button label as shown above (avoid duplicating the count in two places — pick one).

Remove the now-unused `toggleTag` function if nothing else calls it after this change (check first — the validation logic and submit payload still reference `tags` state directly, which is unaffected).

- [ ] **Step 3: Update/add tests**

If an existing test file exercises the old inline chip buttons (e.g. `screen.getByRole("button", { name: "Anime" })`), update those assertions to instead: click the "Select tags" button, then interact with the checkbox inside the now-open modal (`screen.getByRole("checkbox", { name: "Anime" })`). Add a test confirming the button's label updates to reflect the count after selecting tags, and a test confirming the `MAX_TAGS` cap is passed through to `TagPickerModal` (disabling further selection past the cap) rather than re-testing `TagPickerModal`'s own internal cap logic (already covered in Task 2).

- [ ] **Step 4: Run tests, typecheck, lint**

Run: `npm test -- CreatePackForm && npm run typecheck && npm run lint`
Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add src/features/create/CreatePackForm.tsx src/features/create/CreatePackForm.test.tsx
git commit -m "feat: use TagPickerModal in CreatePackForm"
```

---

### Task 4: Wire into `HomeFeed`

**Files:**

- Modify: `src/features/home/HomeFeed.tsx`
- Modify: `src/features/home/HomeFeed.test.tsx` (locate first; adapt as in Task 3)

- [ ] **Step 1: Replace the inline chip row with a button + `TagPickerModal`**

In `src/features/home/HomeFeed.tsx`:

- Add `import { TagPickerModal } from "@/src/shared/components/TagPickerModal";`
- Add local state: `const [tagPickerOpen, setTagPickerOpen] = useState(false);`
- Replace the `<div className="flex flex-wrap gap-2">{PACK_TAGS.map(...)}</div>` block (around line 102) with:

```tsx
<Button
  type="button"
  variant="secondary"
  onClick={() => setTagPickerOpen(true)}
>
  {tags.length === 0 ? "Filter by tags" : `${tags.length} tag${tags.length === 1 ? "" : "s"}`}
</Button>
<TagPickerModal
  open={tagPickerOpen}
  onClose={() => setTagPickerOpen(false)}
  selected={tags}
  onChange={setTags}
/>
```

No `maxTags` here — filtering has no cap, unlike Create's tagging.

Import `Button` from `@/src/shared/components/Button` if not already imported in this file. Remove the now-unused local `toggleTag` function if nothing else calls it.

- [ ] **Step 2: Update/add tests**

Same adaptation as Task 3, Step 3 — locate the existing test file, update any assertions against the old inline chip buttons to instead open the modal first.

- [ ] **Step 3: Run tests, typecheck, lint**

Run: `npm test -- HomeFeed && npm run typecheck && npm run lint`
Expected: all PASS.

- [ ] **Step 4: Commit**

```bash
git add src/features/home/HomeFeed.tsx src/features/home/HomeFeed.test.tsx
git commit -m "feat: use TagPickerModal in HomeFeed filter"
```

---

### Task 5: Final verify + review + manual browser test + PR + merge

- [ ] **Step 1: Run the full verification gate**

Run: `npm test && npm run typecheck && npm run lint && npm run build`
Expected: all PASS. (`npm run build` matters here — this is a client-heavy change and this project has previously caught real build-only failures that `npm test`/`typecheck` alone missed.)

- [ ] **Step 2: Dispatch `pr-review-toolkit:code-reviewer`**

Review the full diff on this branch against `develop`.

- [ ] **Step 3: Manual browser verification**

Start the dev server, open Create Pack and Home, confirm: the modal opens/closes correctly (button, backdrop click, Escape), checkboxes reflect current selection, the Create form's `MAX_TAGS` cap visibly disables further boxes once hit, and Home's filter actually re-queries packs when tags change (no cap there).

- [ ] **Step 4: Push, open a PR against `develop`, and merge once green**

Follow `.claude/workflows/pull-request.md`. Reference and close velanto-frontend#53 in the PR description.
