import type { ReactNode } from "react";
import { cn } from "@/src/shared/lib/cn";

/**
 * The comment presentation shared by every thread in the app — pack comments and
 * suggestion comments both render through these, so the two surfaces cannot
 * drift apart. Geometry comes from Pack Detail.dc.html's comment section, which
 * is the design's canonical treatment.
 *
 * Deliberately presentational: no data fetching, no auth, no vote wiring. Each
 * feature keeps its own behaviour and passes the pieces in as nodes.
 */

/** One thread = one card. Not one card around the whole list. */
export const COMMENT_CARD_CLASS =
  "flex flex-col gap-2.5 rounded-[15px] border border-white/[0.07] bg-surface-card p-[14px]";

/** Gap between thread cards, and between replies inside a thread. */
export const COMMENT_LIST_CLASS = "flex flex-col gap-2.5";

/**
 * A thread's replies, indented behind a hairline rail. The rail is what marks
 * the nesting — there are no rules between individual replies.
 */
export const REPLY_RAIL_CLASS =
  "ms-4 flex flex-col gap-2.5 border-s-2 border-white/[0.08] ps-4";

/** The same rail, tinted while its composer is open, so the draft reads as
 *  attached to the thread it will join. */
export const REPLY_COMPOSER_RAIL_CLASS = "ms-4 border-s-2 border-acc/35 ps-4";

/** Section heading — "COMMENTS · 3" in the mock's tracked small caps. */
export function CommentsHeading({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <h2
      className={cn(
        "text-xs font-bold uppercase tracking-[0.14em] text-foreground-tertiary",
        className,
      )}
    >
      {children}
    </h2>
  );
}

/** The small accent pill beside a handle (CREATOR on a pack, TEAM on staff). */
export function CommentIdentityBadge({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex shrink-0 items-center rounded-[6px] bg-acc/[0.16] px-[7px] py-0.5 text-[10px] font-bold tracking-[0.04em] text-acc-hover">
      {children}
    </span>
  );
}

export type CommentRowVariant = "root" | "reply";

/**
 * One comment: avatar, identity line, body, actions. `reply` is the same layout
 * one step smaller, for the indented column.
 *
 * Every size that differs between the two variants is picked by a branch that
 * emits exactly one class string — `cn()` is a plain join, not tailwind-merge,
 * so a base-plus-override would leave both in the list.
 */
export function CommentRow({
  variant = "root",
  avatar,
  identity,
  badge,
  timestamp,
  body,
  actions,
  trailing,
}: {
  variant?: CommentRowVariant;
  /** The avatar tile — size it with {@link commentAvatarSize}. */
  avatar: ReactNode;
  /** The @handle, already wrapped in whatever link / streamer-mode shell it needs. */
  identity: ReactNode;
  badge?: ReactNode;
  timestamp?: ReactNode;
  body: ReactNode;
  /** The action row under the body (votes, Reply). Omit where there are none. */
  actions?: ReactNode;
  /** Right-aligned control on the identity line (e.g. delete). */
  trailing?: ReactNode;
}) {
  const reply = variant === "reply";
  return (
    <div className="flex gap-[11px]">
      {avatar}
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <div className="flex items-center gap-2">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <span
              className={cn(
                "font-[650] text-foreground",
                reply ? "text-[12.5px]" : "text-[13px]",
              )}
            >
              {identity}
            </span>
            {badge}
            {timestamp && (
              <span
                className={cn(
                  "shrink-0 text-foreground-tertiary",
                  reply ? "text-[11px]" : "text-[11.5px]",
                )}
              >
                {timestamp}
              </span>
            )}
          </div>
          {trailing && <div className="ms-auto flex-none">{trailing}</div>}
        </div>

        <div
          className={cn(
            "leading-[1.55] text-foreground-secondary",
            reply ? "text-[13px]" : "text-[13.5px]",
          )}
        >
          {body}
        </div>

        {actions && (
          <div
            className={cn(
              "flex flex-wrap items-center gap-3.5",
              reply ? "pt-px" : "pt-0.5",
            )}
          >
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}

/** Avatar dimensions per variant — pass to `UserAvatar`'s `className`. */
export function commentAvatarSize(variant: CommentRowVariant): string {
  return variant === "reply"
    ? "h-7 w-7 flex-none rounded-full text-[10.5px]"
    : "h-8 w-8 flex-none rounded-full text-[11.5px]";
}

/**
 * A bare text action under a comment (Reply, a vote button). No box, no fill —
 * the mock's action row is plain text that only changes colour.
 */
export function CommentAction({
  variant = "root",
  active,
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: CommentRowVariant;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      className={cn(
        "inline-flex cursor-pointer items-center gap-1.5 rounded-[4px] font-[650] transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-acc",
        "disabled:cursor-not-allowed disabled:opacity-50",
        variant === "reply" ? "text-[11.5px]" : "text-xs",
        active
          ? "text-foreground"
          : "text-foreground-tertiary hover:text-foreground",
        className,
      )}
      {...props}
    />
  );
}

/**
 * The "write a comment" row: avatar, field, action — inside the same card as a
 * comment, so the composer reads as the first entry in the thread.
 */
export function CommentComposerCard({
  avatar,
  children,
  className,
}: {
  avatar?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn(COMMENT_CARD_CLASS, "gap-0", className)}>
      <div className="flex items-start gap-[11px]">
        {avatar}
        {children}
      </div>
    </div>
  );
}
