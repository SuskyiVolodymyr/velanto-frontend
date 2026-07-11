"use client";

import { useTranslations } from "next-intl";
import type { Group } from "@/src/shared/types/pack";
import { Input } from "@/src/shared/components/Input";
import { Button } from "@/src/shared/components/Button";
import { Text } from "@/src/shared/components/Text";
import { Card } from "@/src/shared/components/Card";
import { cn } from "@/src/shared/lib/cn";
import { useGroupItemDraft } from "@/src/features/create/use-group-item-draft";
import { GroupItemList } from "@/src/features/create/GroupItemList";
import { GroupItemAdder } from "@/src/features/create/GroupItemAdder";

interface GroupEditorProps {
  group: Group;
  index: number;
  removable: boolean;
  onChange: (group: Group) => void;
  onRemove: () => void;
  /** Validation error for this group, surfaced by the parent form on submit. */
  error?: string;
}

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
  const { validating } = draft;

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
        <div className="flex rounded-[9px] border border-border bg-white/[0.03] p-0.5">
          <button
            type="button"
            onClick={() => onChange({ ...group, selectionMode: "random" })}
            disabled={validating}
            className={cn(
              "rounded-[7px] px-3 py-1.5 text-xs font-medium transition-colors",
              group.selectionMode === "random"
                ? "bg-white/[0.12] text-foreground"
                : "text-foreground-secondary",
            )}
          >
            {t("random")}
          </button>
          <button
            type="button"
            onClick={() =>
              onChange({
                ...group,
                selectionMode: "manual",
                sampleSize: undefined,
              })
            }
            disabled={validating}
            className={cn(
              "rounded-[7px] px-3 py-1.5 text-xs font-medium transition-colors",
              group.selectionMode === "manual"
                ? "bg-white/[0.12] text-foreground"
                : "text-foreground-secondary",
            )}
          >
            {t("manual")}
          </button>
        </div>
        {group.selectionMode === "random" && (
          <Input
            type="number"
            min={1}
            value={group.sampleSize ?? ""}
            onChange={(e) =>
              onChange({
                ...group,
                sampleSize:
                  e.target.value === "" ? undefined : Number(e.target.value),
              })
            }
            disabled={validating}
            aria-label={t("groupSampleSize", { index: index + 1 })}
            title={t("itemsDrawnPerRound")}
            className="w-16 text-center"
          />
        )}
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
        addError={draft.addError}
        onSelectType={draft.selectType}
        onDraftTitleChange={draft.setDraftTitle}
        onDraftValueChange={draft.setDraftValue}
        onAdd={() => void draft.addItem()}
      />

      <Text variant="tertiary" className="text-xs">
        {t("itemCount", { count: group.items.length })}
      </Text>

      {error && (
        <Text role="alert" className="text-sm text-[#ff6b6b]">
          {error}
        </Text>
      )}
    </Card>
  );
}
