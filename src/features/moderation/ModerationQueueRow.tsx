"use client";

import Link from "next/link";
import type { Pack } from "@/src/shared/types/pack";
import { FORMAT_LABELS } from "@/src/shared/lib/pack-display";
import { Text } from "@/src/shared/components/Text";
import { Button } from "@/src/shared/components/Button";
import { Badge } from "@/src/shared/components/Badge";

export function ModerationQueueRow({
  pack,
  busy,
  error,
  rejecting,
  rejectReason,
  onApprove,
  onToggleReject,
  onReject,
  onRejectReasonChange,
  onCancelReject,
}: {
  pack: Pack;
  busy?: boolean;
  error?: string;
  rejecting: boolean;
  rejectReason: string;
  onApprove: () => void;
  onToggleReject: () => void;
  onReject: () => void;
  onRejectReasonChange: (value: string) => void;
  onCancelReject: () => void;
}) {
  return (
    <div className="flex flex-col gap-2 rounded-[12px] border border-border bg-surface px-4 py-3">
      <div className="flex items-center gap-3">
        <Badge>{FORMAT_LABELS[pack.format]}</Badge>
        <Text className="flex-1 truncate font-semibold">{pack.title}</Text>
        <Link
          href={`/packs/${pack.id}`}
          className="text-sm text-acc hover:underline"
        >
          View
        </Link>
        <Button variant="secondary" disabled={busy} onClick={onApprove}>
          Approve
        </Button>
        <Button variant="secondary" disabled={busy} onClick={onToggleReject}>
          Reject
        </Button>
      </div>
      <Text variant="secondary" className="line-clamp-2 text-sm">
        {pack.description}
      </Text>
      {rejecting && (
        <div className="flex flex-col gap-2 rounded-[10px] border border-border bg-white/[0.02] p-3">
          <textarea
            aria-label="Rejection reason"
            maxLength={500}
            value={rejectReason}
            onChange={(event) => onRejectReasonChange(event.target.value)}
            placeholder="Reason (optional)"
            className="min-h-16 rounded-[8px] border border-border bg-transparent p-2 text-sm text-foreground"
          />
          <div className="flex gap-2">
            <Button disabled={busy} onClick={onReject}>
              Confirm reject
            </Button>
            <Button variant="secondary" onClick={onCancelReject}>
              Cancel
            </Button>
          </div>
        </div>
      )}
      {error && <Text className="text-sm text-[#ff6b6b]">{error}</Text>}
    </div>
  );
}
