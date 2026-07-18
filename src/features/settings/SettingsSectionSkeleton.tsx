import { Card } from "@/src/shared/components/Card";
import { Skeleton } from "@/src/shared/components/Skeleton";

/**
 * Placeholder for a Settings section while auth is still resolving
 * (`status === "loading"`). Holds the page layout with pulsing blocks instead of
 * each section popping in one by one — or briefly flashing a "log in" prompt
 * before the session is known. Decorative; the sections render their real
 * content (and their own data-loading skeletons) once `status` settles.
 */
export function SettingsSectionSkeleton() {
  return (
    <section className="flex flex-col gap-4" aria-hidden>
      <Skeleton className="h-3 w-28" />
      <Card className="flex flex-col gap-3 hover:translate-y-0 hover:shadow-none">
        <Skeleton className="h-5 w-1/2" />
        <Skeleton className="h-4 w-3/4" />
      </Card>
    </section>
  );
}
