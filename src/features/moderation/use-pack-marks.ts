"use client";

import { useCallback, useMemo, useState } from "react";
import type {
  ChangeRequestMark,
  ChangeRequestMarkKind,
} from "@/src/shared/types/pack";

/**
 * Identity of a mark. `id` is empty for the single-valued pack fields (title,
 * description, cover, tags) — there is only one of each, so the kind alone
 * names it. The backend enforces the same rule and rejects an id on those.
 */
export interface MarkTarget {
  kind: ChangeRequestMarkKind;
  id?: string;
  /**
   * What the thing is called right now. Captured at mark time and sent with the
   * request, so the author sees the name the moderator was looking at even
   * after they rename it.
   */
  label: string;
}

function keyOf(kind: ChangeRequestMarkKind, id: string): string {
  return `${kind}:${id}`;
}

/**
 * The set of things a moderator has marked for edit while reviewing a pack,
 * plus the per-mark note they typed.
 *
 * Lives above both the contents preview and the decision sidebar because the
 * two ends of the screen are the same list seen twice: you mark an item down in
 * the pool grid, and it appears in the sidebar's "changes requested" summary.
 * Ephemeral by design — nothing is persisted until Send request, so navigating
 * away discards a half-written review rather than leaving a phantom one on the
 * pack.
 *
 * Marks are keyed `kind:id`, never on the label: two items can share a title,
 * and a round's name is optional.
 */
export function usePackMarks() {
  const [marks, setMarks] = useState<Record<string, ChangeRequestMark>>({});

  const isMarked = useCallback(
    (kind: ChangeRequestMarkKind, id = "") => keyOf(kind, id) in marks,
    [marks],
  );

  const toggle = useCallback((target: MarkTarget) => {
    const id = target.id ?? "";
    const key = keyOf(target.kind, id);
    setMarks((current) => {
      if (key in current) {
        // Unmarking drops the note with it. Keeping it would silently restore
        // text the moderator had decided against the next time they re-marked.
        const next = { ...current };
        delete next[key];
        return next;
      }
      return {
        ...current,
        [key]: { kind: target.kind, id, label: target.label, request: "" },
      };
    });
  }, []);

  const setRequest = useCallback(
    (kind: ChangeRequestMarkKind, id: string, request: string) => {
      const key = keyOf(kind, id);
      setMarks((current) =>
        key in current
          ? { ...current, [key]: { ...current[key], request } }
          : current,
      );
    },
    [],
  );

  const clear = useCallback(() => setMarks({}), []);

  // Insertion order is the order the moderator worked through the pack, which
  // is the order the sidebar and the author's list should read in.
  const list = useMemo(() => Object.values(marks), [marks]);

  return {
    marks: list,
    count: list.length,
    isMarked,
    toggle,
    setRequest,
    clear,
  };
}

export type PackMarks = ReturnType<typeof usePackMarks>;
