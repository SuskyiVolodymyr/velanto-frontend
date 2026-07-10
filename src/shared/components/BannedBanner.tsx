"use client";

import { useAuth } from "@/src/shared/lib/auth-context";
import { useClientData } from "@/src/shared/hooks/useClientData";
import { rulesClient } from "@/src/shared/lib/rules-client";
import { isActiveBan } from "@/src/shared/lib/ban-display";
import { BannedNotice } from "@/src/shared/components/BannedNotice";

/**
 * App-shell wiring for {@link BannedNotice}: reads the current user's ban fields
 * from the auth context and, only when they're actually banned, fetches the rule
 * categories to resolve the reason title. Rendered once near the top of the
 * layout so a banned user sees the notice on every page. Renders nothing for
 * everyone else (and never fetches `/rules` for them).
 */
export function BannedBanner() {
  const { user } = useAuth();
  const banned = isActiveBan(user?.bannedUntil);
  const rules = useClientData(() => rulesClient.getRules(), [], { enabled: banned });

  if (!user || !banned) return null;

  return (
    <BannedNotice
      bannedUntil={user.bannedUntil ?? null}
      banReason={user.banReason ?? null}
      banReasonDetail={user.banReasonDetail ?? null}
      categories={rules.data?.categories ?? []}
    />
  );
}
