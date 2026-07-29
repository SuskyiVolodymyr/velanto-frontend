import { getTranslations } from "next-intl/server";
import { JoinRoomCard } from "@/src/features/home/JoinRoomCard";
import { Text } from "@/src/shared/components/Text";
import { ROOMS_DORMANT } from "@/src/features/friends-rooms/room-types";

/**
 * The dashboard's top hero (mock: Dashboard.dc.html): one gradient card
 * carrying the room-modes pitch on the left and the real join-by-code panel
 * ({@link JoinRoomCard}) nested on the right — a single `data-el="hero"`
 * card with an inner `herogrid`, not two separate cards side by side.
 *
 * Gated on `ROOMS_DORMANT`, but never fully disappears: the promo half (and
 * its `<h1>`, the page's only one) is dropped when dormant, leaving a
 * screen-reader-only fallback heading so `/` always has exactly one — see
 * `FallbackHeading` below. `JoinRoomCard` carries the same `ROOMS_DORMANT`
 * gate itself as a second, independent safety net.
 *
 * The mock's earlier "Start a room" / "See the modes" CTAs were dropped by
 * the same redesign that merged the two cards — this hero is pitch + join
 * only now.
 */
export async function DashboardHero() {
  const t = await getTranslations("home.hero");
  if (ROOMS_DORMANT) return <FallbackHeading title={t("title")} />;

  return (
    <section className="relative overflow-hidden rounded-[20px] border border-border bg-[linear-gradient(135deg,#1b2430_0%,var(--surface-card)_60%)] p-[26px]">
      <div
        aria-hidden
        className="pointer-events-none absolute -right-[60px] -bottom-[90px] size-[280px] rounded-full bg-acc/[0.16] blur-[50px]"
      />
      <div className="relative grid grid-cols-1 items-center gap-7 min-[1000px]:grid-cols-[1.15fr_1fr]">
        <div className="flex flex-col gap-3.5">
          <span className="w-fit rounded-pill bg-hot/[0.15] px-2.5 py-1 text-[11px] font-bold tracking-[0.1em] text-hot">
            {t("badge")}
          </span>
          <Text
            as="h1"
            variant="title"
            className="text-pretty text-[32px] leading-[1.1] tracking-[-0.02em] max-[880px]:text-[26px]"
          >
            {t("title")}
          </Text>
          <Text
            variant="secondary"
            className="max-w-[52ch] text-pretty text-sm leading-[1.55]"
          >
            {t("subtitle")}
          </Text>
        </div>

        <JoinRoomCard />
      </div>
    </section>
  );
}

/** `/`'s only heading while `ROOMS_DORMANT` hides the promo pitch above. */
function FallbackHeading({ title }: { title: string }) {
  return <h1 className="sr-only">{title}</h1>;
}
