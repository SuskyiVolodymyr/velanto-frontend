import type { Group, Category } from "@/src/shared/types/pack";

// Fresh, empty draft entries for the create form. Shared by the form's
// `defaultValues` and the Groups editor's "add group" action so a new group
// always starts in the same shape.
export function newGroup(): Group {
  return {
    id: crypto.randomUUID(),
    name: "",
    selectionMode: "manual",
    items: [],
  };
}

export function newCategory(): Category {
  return { id: crypto.randomUUID(), name: "", items: [] };
}
