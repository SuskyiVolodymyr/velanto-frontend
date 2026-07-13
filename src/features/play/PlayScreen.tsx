"use client";

import { useTranslations } from "next-intl";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/src/shared/lib/auth-context";
import { Text } from "@/src/shared/components/Text";
import { Button } from "@/src/shared/components/Button";
import type { Pack } from "@/src/shared/types/pack";
import { VersusRound } from "@/src/features/play/VersusRound";
import { usePlaySession } from "@/src/features/play/use-play-session";
import {
  INSTRUCTION_KEY,
  PICKED_LABEL_KEY,
} from "@/src/features/play/play-format-copy";
import { PlayProgress } from "@/src/features/play/PlayProgress";
import { CandidateCard } from "@/src/features/play/CandidateCard";
import { PlayFinished } from "@/src/features/play/PlayFinished";
import { PicksSummary } from "@/src/features/play/PicksSummary";

export function PlayScreen({ pack }: { pack: Pack }) {
  const { status } = useAuth();
  const t = useTranslations("play");
  const router = useRouter();
  const pathname = usePathname();
  const session = usePlaySession(pack);

  if (status === "loading") return null;

  if (status === "unauthenticated") {
    return (
      <div className="mx-auto max-w-md py-16 text-center">
        <Text variant="secondary">{t("loginRequired")}</Text>
        <Button
          className="mt-4"
          onClick={() =>
            router.push(`/auth?next=${encodeURIComponent(pathname)}`)
          }
        >
          {t("logIn")}
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-2xl flex-1 px-7 py-10">
      <PlayProgress
        isFinished={session.isFinished}
        roundIndex={session.roundIndex}
        totalRounds={session.totalRounds}
        progressPct={session.progressPct}
      />

      {session.showRound && (
        <>
          <section className="mb-6">
            <Text as="h1" variant="title" className="mb-2 text-3xl">
              {session.roundTitle}
            </Text>
            <Text variant="secondary">{t(INSTRUCTION_KEY[pack.format])}</Text>
          </section>

          {session.isVersus ? (
            <div className="mb-8">
              <VersusRound
                sideA={{
                  ...session.categoryA!,
                  items: session.versusCandidatesA,
                }}
                sideB={{
                  ...session.categoryB!,
                  items: session.versusCandidatesB,
                }}
                selectedId={session.selectedId}
                onSelect={session.setSelectedId}
              />
            </div>
          ) : (
            <div className="mb-8 flex flex-wrap gap-4">
              {session.candidates.map((item, index) => (
                <CandidateCard
                  key={item.id}
                  item={item}
                  index={index}
                  selected={item.id === session.selectedId}
                  onSelect={() => session.setSelectedId(item.id)}
                />
              ))}
            </div>
          )}

          <div className="mb-10 flex justify-end">
            <Button
              disabled={!session.canConfirm}
              onClick={session.confirmPick}
            >
              {t("nextRound")}
            </Button>
          </div>
        </>
      )}

      {session.isFinished && (
        <PlayFinished
          isVersus={session.isVersus}
          pickCount={session.picks.length}
          packId={pack.id}
          format={pack.format}
          categoryAName={session.categoryA?.name}
          categoryBName={session.categoryB?.name}
        />
      )}

      {session.picks.length > 0 && (
        <PicksSummary
          label={t(PICKED_LABEL_KEY[pack.format])}
          picks={session.picks}
        />
      )}
    </div>
  );
}
