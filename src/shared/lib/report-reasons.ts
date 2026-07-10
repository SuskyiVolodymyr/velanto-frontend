import type { ReportType } from "@/src/shared/types/report";

// Fixed taxonomy, not free text — mirrors velanto-backend's
// src/modules/reports/types/reasons.ts exactly (short canonical ids); this
// repo doesn't import backend types (see report.ts's file header), so the
// label text is duplicated deliberately, sourced verbatim from the design
// mocks' own REPORT_REASONS arrays (Vilante Pack.dc.html, Vilante
// Author.dc.html, Vilante Play*.dc.html).
export const REPORT_REASON_LABELS: Record<
  ReportType,
  Record<string, string>
> = {
  pack: {
    inappropriate: "Inappropriate or offensive content",
    copyright: "Copyright or ownership issue",
    spam: "Spam or misleading",
    other: "Something else",
  },
  user: {
    harassment: "Harassment or abuse",
    impersonation: "Impersonation",
    spam: "Spam or scam",
    other: "Something else",
  },
  round: {
    wrong_answer: "Wrong or mislabeled item",
    broken_media: "Image or video not loading",
    inappropriate: "Inappropriate content",
    other: "Something else",
  },
};

export function reportReasonLabel(type: ReportType, reason: string): string {
  return REPORT_REASON_LABELS[type][reason] ?? reason;
}
