"use client";

import { useTranslations } from "next-intl";
import type { Group } from "@/src/shared/types/pack";
import { Input } from "@/src/shared/components/Input";
import { Button } from "@/src/shared/components/Button";
import { Text } from "@/src/shared/components/Text";
import { Card } from "@/src/shared/components/Card";
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
    onChange({
      ...group,
      items: group.items.filter((item) => item.id !== itemId),
    });
  }

  return (
    <Card className="flex flex-col gap-3 hover:translate-y-0 hover:shadow-none">
      <div className="flex flex-wrap items-center gap-2.5">
        <Input
          value={group.name}
          onChange={(e) => onChange({ ...group, name: e.target.value })}
          placeholder={t("groupName", { index: index + 1 })}
          aria-label={t("groupName", { index: index + 1 })}
          className="flex-1 min-w-[140px] font-semibold"
        />
        {removable && (
          <Button
            variant="ghost"
            type="button"
            onClick={onRemove}
            aria-label={t("removeGroup", { index: index + 1 })}
          >
            {t("remove")}
          </Button>
        )}
      </div>

      <GroupItemList items={group.items} onRemove={removeItem} />

      <GroupItemAdder
        index={index}
        draftType={draft.draftType}
        draftTitle={draft.draftTitle}
        draftValue={draft.draftValue}
        validating={draft.validating}
        uploading={draft.uploading}
        imagePreviewUrl={draft.imagePreviewUrl}
        addError={draft.addError}
        onSelectType={draft.selectType}
        onDraftTitleChange={draft.setDraftTitle}
        onDraftValueChange={draft.setDraftValue}
        onSelectImage={(file) => void draft.selectImageFile(file)}
        onAdd={() => void draft.addItem()}
      />

      <Text variant="tertiary" className="text-xs">
        {t("itemCount", { count: group.items.length })}
      </Text>

      {error && (
        <Text variant="danger" role="alert" className="text-sm">
          {error}
        </Text>
      )}
    </Card>
  );
}
