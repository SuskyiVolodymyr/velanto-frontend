import { Text } from "@/src/shared/components/Text";
import type { PackFormat } from "@/src/shared/types/pack";

type Step = { title: string; desc: string };

// Short, mode-specific "how it plays" explainer steps, one set per format.
const STEPS: Record<PackFormat, Step[]> = {
  save_one: [
    {
      title: "A group's pool appears",
      desc: "Each round shows a group's items — a random sample, or all of them if the creator arranged them manually.",
    },
    {
      title: "You save one",
      desc: "Pick your single favorite; the rest are dropped for that round.",
    },
    {
      title: "Next group, same deal",
      desc: "One save per group, across every round — no going back to change a pick.",
    },
  ],
  sacrifice_one: [
    {
      title: "A group's pool appears",
      desc: "Each round shows a group's items to choose between.",
    },
    {
      title: "You sacrifice one",
      desc: "Cut the one you like least; the others move on.",
    },
    {
      title: "Next group, same deal",
      desc: "One cut per round, across every group.",
    },
  ],
  nxn: [
    {
      title: "Two categories face off",
      desc: "Each round pits items from two categories head-to-head.",
    },
    {
      title: "Pick a side",
      desc: "Choose the item you prefer in every matchup.",
    },
    {
      title: "Picks tally up",
      desc: "Your choices add up across all rounds to a final result.",
    },
  ],
  rank_blind: [
    {
      title: "Items appear one at a time",
      desc: "You see each item blind, without knowing what comes next.",
    },
    {
      title: "Place it in your ranking",
      desc: "Slot each item into your growing ranked list as you go.",
    },
    {
      title: "No do-overs",
      desc: "Your ranking locks in once every item is placed.",
    },
  ],
  "1v1": [
    {
      title: "Two items, head-to-head",
      desc: "Every round is a straight one-versus-one matchup.",
    },
    {
      title: "Pick the winner",
      desc: "Choose your favorite of the two.",
    },
    {
      title: "Winners tally up",
      desc: "Results add up across every matchup.",
    },
  ],
};

export function PackHowItPlays({ format }: { format: PackFormat }) {
  const steps = STEPS[format];

  return (
    <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
      {steps.map((step, index) => (
        <div
          key={step.title}
          className="flex flex-col gap-2.5 rounded-[14px] border border-border bg-white/[0.02] p-[18px]"
        >
          <span className="flex h-[26px] w-[26px] items-center justify-center rounded-[8px] bg-white/[0.06] text-[12.5px] font-semibold text-foreground-secondary">
            {index + 1}
          </span>
          <Text className="text-[14.5px] font-semibold">{step.title}</Text>
          <Text variant="secondary" className="text-[13px] leading-relaxed">
            {step.desc}
          </Text>
        </div>
      ))}
    </div>
  );
}
