"use client";

import { useTranslations } from "next-intl";
import type { Group } from "@/src/shared/types/pack";
import { Text } from "@/src/shared/components/Text";
import { useGroupItemDraft } from "@/src/features/create/use-group-item-draft";
import { GroupItemList } from "@/src/features/create/GroupItemList";
import { GroupItemAdder } from "@/src/features/create/GroupItemAdder";

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

  function removeItem(itemId: string) {
    // Removing the item currently lifted into the form row would leave the row
    // editing something that no longer exists, so drop back to composing.
    if (itemId === draft.editingItemId) draft.cancelEdit();
    onChange({
      ...group,
      items: group.items.filter((item) => item.id !== itemId),
    });
  }

  return (
    <div className="flex flex-col gap-[13px] rounded-tile border border-border bg-surface-card p-[15px]">
      <div className="flex flex-wrap items-center gap-2.5">
        <span
          aria-hidden="true"
          className="h-6 w-[5px] shrink-0 rounded-[3px] bg-acc opacity-55"
        />
        <input
          value={group.name}
          onChange={(e) => onChange({ ...group, name: e.target.value })}
          placeholder={t("groupName", { index: index + 1 })}
          aria-label={t("groupName", { index: index + 1 })}
          className="h-[46px] min-w-[140px] flex-1 rounded-control border border-white/10 bg-background px-4 text-[15px] font-semibold text-foreground placeholder:text-foreground-tertiary transition-colors duration-150 focus:outline-none focus:border-acc focus-visible:ring-2 focus-visible:ring-acc/40"
        />
        {removable && (
          <button
            type="button"
            onClick={onRemove}
            aria-label={t("removeGroup", { index: index + 1 })}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-control border border-border text-foreground-secondary transition-colors hover:border-danger/40 hover:text-danger"
          >
            ×
          </button>
        )}
      </div>

      <GroupItemList
        items={group.items}
        editingItemId={draft.editingItemId}
        onEdit={draft.beginEdit}
        onRemove={removeItem}
      />

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
        onAdd={() => void draft.addItem()}
        editing={draft.editingItemId !== null}
        onCancelEdit={draft.cancelEdit}
      />

      <Text variant="tertiary" className="text-xs">
        {t("itemCount", { count: group.items.length })}
      </Text>

      {error && (
        <Text variant="danger" role="alert" className="text-sm">
          {error}
        </Text>
      )}
    </div>
  );
}
