import type { CreatePackValues } from "@/src/features/create/create-pack.schema";

export type PackSummary = {
  elementCount: number;
  poolCount: number;
  roundCount: number;
  canPublish: boolean;
};

// Pure derivation of everything the live-preview panel and the Publish CTA
// gate display. `canPublish` is a cheap MIRROR of the zod schema's basic
// preconditions (non-empty title/description, at least one element) — it is
// a display gate for the CTA label only, never a substitute for
// zodResolver(createPackSchema) at submit time.
export function summarizePack(values: CreatePackValues): PackSummary {
  const elementCount = values.groups.reduce(
    (sum, group) => sum + group.items.length,
    0,
  );
  const poolCount = values.groups.length;
  // Authoritative real state in this codebase's model — rounds are ordered
  // entities in their own right, not derived from pool/group count (D1).
  const roundCount = values.rounds.length;
  const canPublish =
    values.title.trim() !== "" &&
    values.description.trim() !== "" &&
    elementCount > 0;

  return { elementCount, poolCount, roundCount, canPublish };
}
