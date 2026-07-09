"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/src/shared/lib/auth-context";
import { reportsClient } from "@/src/shared/lib/reports-client";
import { packsClient } from "@/src/shared/lib/packs-client";
import { usersClient, type BanDuration } from "@/src/shared/lib/users-client";
import { BAN_DURATIONS } from "@/src/shared/lib/ban-durations";
import { reportReasonLabel } from "@/src/shared/lib/report-reasons";
import { reportTargetLabel } from "@/src/shared/lib/report-display";
import { Text } from "@/src/shared/components/Text";
import { Button } from "@/src/shared/components/Button";
import { Input } from "@/src/shared/components/Input";
import { StatusBadge } from "@/src/shared/components/StatusBadge";
import type { ReportWithReporter } from "@/src/shared/types/report";

export function SupportReportScreen({ reportId }: { reportId: string }) {
  const { user, status: authStatus } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const [report, setReport] = useState<ReportWithReporter | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [actionError, setActionError] = useState("");
  const [actionBusy, setActionBusy] = useState(false);
  const [deleted, setDeleted] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [showBanForm, setShowBanForm] = useState(false);
  const [banDuration, setBanDuration] = useState<BanDuration>("week");
  const [banReason, setBanReason] = useState("");
  const [banError, setBanError] = useState("");
  const [banDone, setBanDone] = useState(false);

  // Computed here (ahead of the `authStatus`/`status` early returns below)
  // rather than alongside the JSX, per Rules of Hooks: the report-fetch
  // effect below reads `allowed`, and hooks can't follow a conditional
  // return — same discipline AuthorScreen.tsx had to apply.
  const allowed = user?.role === "moderator" || user?.role === "manager" || user?.role === "admin";

  useEffect(() => {
    if (authStatus === "authenticated" && !allowed) {
      router.replace("/");
    }
  }, [authStatus, allowed, router]);

  // reportId can change without a remount (e.g. clicking a different report
  // link while already on a report detail page), so the reset to "loading"
  // must happen here rather than via a useState initializer.
  useEffect(() => {
    if (!allowed) return;
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setStatus("loading");
    reportsClient
      .getById(reportId)
      .then((result) => {
        if (cancelled) return;
        setReport(result);
        setStatus("ready");
      })
      .catch(() => {
        if (cancelled) return;
        setStatus("error");
      });
    return () => {
      cancelled = true;
    };
  }, [allowed, reportId]);

  async function handleReview() {
    setActionBusy(true);
    setActionError("");
    try {
      const updated = await reportsClient.review(reportId);
      setReport((prev) => (prev ? { ...prev, ...updated } : prev));
    } catch {
      setActionError("Couldn't mark this report as reviewing. Try again.");
    } finally {
      setActionBusy(false);
    }
  }

  async function handleClose() {
    setActionBusy(true);
    setActionError("");
    try {
      const updated = await reportsClient.close(reportId);
      setReport((prev) => (prev ? { ...prev, ...updated } : prev));
    } catch {
      setActionError("Couldn't close this report. Try again.");
    } finally {
      setActionBusy(false);
    }
  }

  async function handleDeletePack() {
    if (!report) return;
    setDeleteError("");
    try {
      await packsClient.delete(report.targetId);
      setDeleted(true);
    } catch {
      setDeleteError("Couldn't delete this pack. Try again.");
    }
  }

  async function handleBanSubmit() {
    if (!report || !banReason.trim()) return;
    setBanError("");
    try {
      await usersClient.ban(report.targetId, { duration: banDuration, reason: banReason.trim() });
      setBanDone(true);
      setShowBanForm(false);
    } catch {
      setBanError("Couldn't ban this user. Try again.");
    }
  }

  if (authStatus === "loading") return null;

  if (authStatus === "unauthenticated") {
    return (
      <div className="mx-auto max-w-md py-16 text-center">
        <Text variant="secondary">You need to be logged in to view this page.</Text>
        <Button className="mt-4" onClick={() => router.push(`/auth?next=${encodeURIComponent(pathname)}`)}>
          Log in
        </Button>
      </div>
    );
  }

  if (!allowed) return null;

  if (status === "loading") return null;

  if (status === "error" || !report) {
    return (
      <div className="mx-auto max-w-md py-16 text-center">
        <Text className="text-[#ff6b6b]">This report doesn&apos;t exist.</Text>
      </div>
    );
  }

  const target = reportTargetLabel(report);

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-7 py-10">
      <div className="flex items-center justify-between">
        <Text as="h1" variant="title" className="text-2xl">
          {reportReasonLabel(report.type, report.reason)}
        </Text>
        <StatusBadge kind="report" status={report.status} />
      </div>

      <div className="flex flex-col gap-2 text-sm">
        <Text variant="secondary">
          Reported by <span className="font-semibold text-foreground">{report.reporterUsername}</span> on{" "}
          {new Date(report.createdAt).toLocaleString()}
        </Text>
        <span className="text-xs font-semibold uppercase text-foreground-secondary">{report.type}</span>
        <Link href={target.href} className="text-acc hover:underline">
          {target.text}
        </Link>
        {report.comment && <Text variant="secondary">{report.comment}</Text>}
      </div>

      <div className="flex flex-wrap gap-2">
        {report.status === "new" && (
          <Button disabled={actionBusy} onClick={() => void handleReview()}>
            Review
          </Button>
        )}
        {report.status !== "closed" && (
          <Button variant="secondary" disabled={actionBusy} onClick={() => void handleClose()}>
            Mark resolved
          </Button>
        )}
      </div>
      {actionError && <Text className="text-sm text-[#ff6b6b]">{actionError}</Text>}

      <div className="flex flex-col gap-3 rounded-[15px] border border-red-500/20 bg-red-500/[0.03] p-5">
        <Text className="text-xs font-semibold tracking-wide text-red-400">MODERATION ACTIONS</Text>
        {(report.type === "pack" || report.type === "round") && (
          <div>
            <Button variant="secondary" disabled={deleted} onClick={() => void handleDeletePack()}>
              {deleted ? "Pack deleted ✓" : "Delete pack"}
            </Button>
            {deleteError && <Text className="mt-2 text-xs text-[#ff6b6b]">{deleteError}</Text>}
          </div>
        )}
        {report.type === "user" && (
          <div>
            {!banDone && (
              <Button variant="secondary" onClick={() => setShowBanForm((v) => !v)}>
                Ban user
              </Button>
            )}
            {banDone && <Text variant="secondary">User banned.</Text>}
            {showBanForm && (
              <div className="mt-3 flex flex-wrap items-end gap-2 border-t border-border pt-3">
                <label className="flex flex-col gap-1 text-xs text-foreground-secondary">
                  Duration
                  <select
                    value={banDuration}
                    onChange={(e) => setBanDuration(e.target.value as BanDuration)}
                    aria-label="Ban duration"
                    className="h-9 rounded-[8px] border border-border bg-surface px-2 text-sm text-foreground"
                  >
                    {BAN_DURATIONS.map((d) => (
                      <option key={d.value} value={d.value}>
                        {d.label}
                      </option>
                    ))}
                  </select>
                </label>
                <Input
                  value={banReason}
                  onChange={(e) => setBanReason(e.target.value)}
                  placeholder="Reason"
                  aria-label="Ban reason"
                  className="h-9 max-w-xs"
                />
                <Button variant="primary" disabled={!banReason.trim()} onClick={() => void handleBanSubmit()}>
                  Confirm ban
                </Button>
                {banError && <Text className="text-xs text-[#ff6b6b]">{banError}</Text>}
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
