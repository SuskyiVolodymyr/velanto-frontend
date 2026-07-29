"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { ChevronDown } from "lucide-react";
import type { Group, Item } from "@/src/shared/types/pack";
import { Text } from "@/src/shared/components/Text";
import { cn } from "@/src/shared/lib/cn";
import { useGroupItemDraft } from "@/src/features/create/use-group-item-draft";
import { GroupItemList } from "@/src/features/create/GroupItemList";
import { GroupItemAdder } from "@/src/features/create/GroupItemAdder";

// Mock (Create Pack.dc.html): each pool's identity color, cycled by its
// position — the color bar next to its name, distinguishing pools at a
// glance the same way FORMAT_HUE distinguishes format cards.
const POOL_HUES = [
  "0,229,255",
  "255,92,192",
  "57,217,138",
  "255,194,75",
  "168,132,255",
];

interface GroupEditorProps {
  group: Group;
  index: number;
  removable: boolean;
  onChange: (group: Group) => void;
  onRemove: () => void;
  /** Validation error for this pool, surfaced by the parent form on submit. */
  error?: string;
}

/**
 * Editor for a single reusable POOL of items: a name plus its item list. Drawing
 * (random/manual + count) is a per-round concern now, so this editor no longer
 * carries a selection-mode toggle or sample-size input — those live in
 * {@link RoundsEditor} / {@link VersusEditor}.
 */
export function GroupEditor({
  group,
  index,
  removable,
  onChange,
  onRemove,
  error,
}: GroupEditorProps) {
  const t = useTranslations("create");
  const draft = useGroupItemDraft(group, onChange);
  // Which panel (if any) is expanded: the "+ Add item" trigger's own add
  // panel, a specific chip's inline edit panel, or neither (T5 — items are
  // read-only chips by default; nothing is docked open at the bottom).
  const [expandedFor, setExpandedFor] = useState<"new" | string | null>(null);
  // Collapsible (matches RoundsEditor's own collapsed-summary pattern):
  // starts OPEN — a pool's contents are the whole point of this section, so
  // collapsing is an opt-in the author reaches for once a pool is long, not
  // a default that would hide a fresh pool's empty state.
  const [collapsed, setCollapsed] = useState(false);
  const hue = POOL_HUES[index % POOL_HUES.length];

  function removeItem(itemId: string) {
    // Removing the item currently lifted into the form row would leave the row
    // editing something that no longer exists, so drop back to composing.
    if (itemId === draft.editingItemId) draft.cancelEdit();
    onChange({
      ...group,
      items: group.items.filter((item) => item.id !== itemId),
    });
    if (expandedFor === itemId) setExpandedFor(null);
  }

  function openAddPanel() {
    setExpandedFor("new");
  }

  function openEditPanel(item: Item) {
    draft.beginEdit(item);
    setExpandedFor(item.id);
  }

  async function commit() {
    const added = await draft.addItem();
    if (added) setExpandedFor(null);
  }

  function collapseAdder() {
    draft.cancelEdit();
    setExpandedFor(null);
  }

  function deleteEditing() {
    if (draft.editingItemId) removeItem(draft.editingItemId);
    setExpandedFor(null);
  }

  function renderAdder(editing: boolean) {
    return (
      <GroupItemAdder
        index={index}
        draftType={draft.draftType}
        draftTitle={draft.draftTitle}
        draftValue={draft.draftValue}
        validating={draft.validating}
        uploading={draft.uploading}
        imagePreviewUrl={draft.imagePreviewUrl}
        imageFile={draft.imageFile}
        addError={draft.addError}
        onSelectType={draft.selectType}
        onDraftTitleChange={draft.setDraftTitle}
        onDraftValueChange={draft.setDraftValue}
        onSelectImage={(file) => void draft.selectImageFile(file)}
        onApplyCrop={(cropped) => void draft.applyCroppedImage(cropped)}
        onAdd={() => void commit()}
        editing={editing}
        onCancelEdit={collapseAdder}
        onDelete={editing ? deleteEditing : undefined}
      />
    );
  }

  return (
    <div className="flex flex-col gap-[11px] rounded-tile border border-border bg-surface-card p-[15px]">
      <div className="flex flex-wrap items-center gap-2.5">
        <span
          aria-hidden="true"
          className="h-[26px] w-[9px] flex-none rounded-pill"
          style={{ backgroundColor: `rgb(${hue})` }}
        />
        <input
          value={group.name}
          onChange={(e) => onChange({ ...group, name: e.target.value })}
          // Placeholder is plain "Pool name" (T7) — a transient hint that
          // disappears the moment the author types, so the mock drops the
          // index from it. The accessible name keeps the index: it's what
          // distinguishes several still-unnamed pools from each other, for
          // both screen readers and the many e2e/vitest selectors keyed on
          // "Pool 1 name" / "Pool 2 name".
          placeholder={t("groupNamePlaceholder")}
          aria-label={t("groupName", { index: index + 1 })}
          className="h-[38px] min-w-[140px] flex-1 rounded-[10px] border border-transparent bg-transparent px-3 text-[14px] font-semibold text-foreground placeholder:text-foreground-tertiary transition-colors duration-150 hover:border-white/10 hover:bg-background focus:border-acc focus:bg-background focus:outline-none"
        />
        <span className="rounded-[7px] bg-white/[0.07] px-[9px] py-[3px] text-[11.5px] font-bold text-foreground-secondary">
          {t("itemCount", { count: group.items.length })}
        </span>
        <Text
          variant="tertiary"
          className="ms-auto hidden text-[11.5px] sm:inline"
        >
          {t("clickItemToEdit")}
        </Text>
        <button
          type="button"
          onClick={() => setCollapsed((c) => !c)}
          aria-label={
            collapsed ? t("expandPool", { index: index + 1 }) : t("collapsePool", { index: index + 1 })
          }
          aria-expanded={!collapsed}
          className="flex h-8 w-8 flex-none items-center justify-center rounded-[9px] border border-border text-foreground-secondary transition-colors hover:text-foreground"
        >
          <ChevronDown
            aria-hidden
            className={cn("h-4 w-4 transition-transform", collapsed && "-rotate-90")}
            strokeWidth={1.9}
          />
        </button>
        {removable && (
          <button
            type="button"
            onClick={onRemove}
            title={t("deletePool")}
            aria-label={t("removeGroup", { index: index + 1 })}
            className="flex h-8 w-8 flex-none items-center justify-center rounded-[9px] border border-border text-foreground-secondary transition-colors hover:border-danger/40 hover:text-danger"
          >
            <svg
              aria-hidden
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.9"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M4 7h16M9 7V5h6v2M6.5 7l1 13h9l1-13" />
            </svg>
          </button>
        )}
      </div>

      {!collapsed && (
        <>
          <GroupItemList
            items={group.items}
            editingItemId={expandedFor === "new" ? null : expandedFor}
            onEdit={openEditPanel}
            onRemove={removeItem}
            renderEditPanel={() => renderAdder(true)}
            trailing={
              expandedFor === null && (
                <button
                  type="button"
                  onClick={openAddPanel}
                  className="inline-flex h-8 items-center gap-[7px] rounded-pill border border-dashed border-white/[0.18] px-[13px] text-xs font-semibold text-foreground-secondary transition-colors hover:border-acc hover:text-foreground"
                >
                  <svg
                    aria-hidden
                    width="13"
                    height="13"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.4"
                    strokeLinecap="round"
                  >
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                  {t("addItemTrigger")}
                </button>
              )
            }
          />

          {expandedFor === "new" && renderAdder(false)}

          {error && (
            <Text variant="danger" role="alert" className="text-sm">
              {error}
            </Text>
          )}
        </>
      )}
    </div>
  );
}
