import Link from "next/link";
import { Text } from "@/src/shared/components/Text";
import { buttonClassName } from "@/src/shared/components/Button";

interface PlayFinishedProps {
  isVersus: boolean;
  pickCount: number;
  packId: string;
  finishedVerb?: string;
  categoryAName?: string;
  categoryBName?: string;
}

export function PlayFinished({
  isVersus,
  pickCount,
  packId,
  finishedVerb,
  categoryAName,
  categoryBName,
}: PlayFinishedProps) {
  return (
    <section className="mb-10">
      <Text as="h1" variant="title" className="mb-2 text-3xl">
        All rounds done
      </Text>
      <Text variant="secondary" className="mb-4">
        {isVersus
          ? `You picked a side in ${pickCount} round${pickCount === 1 ? "" : "s"} between ${categoryAName} and ${categoryBName}.`
          : `You ${finishedVerb} ${pickCount} pick${pickCount === 1 ? "" : "s"}, one per round.`}
      </Text>
      <Link href={`/packs/${packId}/result`} className={buttonClassName("primary", "w-fit")}>
        See your result
      </Link>
    </section>
  );
}
