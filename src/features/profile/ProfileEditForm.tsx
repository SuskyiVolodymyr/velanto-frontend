"use client";

import { useState } from "react";
import Link from "next/link";
import { Check } from "lucide-react";
import { useTranslations } from "next-intl";
import { useAuth } from "@/src/shared/lib/auth-context";
import {
  useMyProfile,
  useUpdateBio,
  useChangeUsername,
} from "@/src/features/profile/api/profile.queries";
import { messageFromError } from "@/src/shared/lib/messageFromError";
import { ApiError } from "@/src/shared/lib/api-client";
import { USERNAME_PATTERN } from "@/src/features/auth/auth.schema";
import { Text } from "@/src/shared/components/Text";
import { Button, buttonClassName } from "@/src/shared/components/Button";
import { PageHeader } from "@/src/shared/components/PageHeader";
import { AvatarSection } from "@/src/features/profile/AvatarSection";
import { ProfileEditPreview } from "@/src/features/profile/ProfileEditPreview";
import { cn } from "@/src/shared/lib/cn";
import { pageContainer } from "@/src/shared/lib/page-container";

const BIO_MAX = 280;
const USERNAME_MAX = 16;

/** The mock's small-caps field label, shared by both fields. */
const FIELD_LABEL = "text-[11.5px] font-[650] text-foreground-secondary";

export function ProfileEditForm() {
  const t = useTranslations("profile");
  const tAuth = useTranslations("auth");
  const tAuthErrors = useTranslations("auth.errors");
  const { user, status: authStatus, patchUser } = useAuth();

  const profileQuery = useMyProfile(user?.id ?? "", {
    enabled: authStatus === "authenticated" && !!user,
  });
  // Each `*Draft` is null until the user edits that field; the input shows the
  // fetched value until then (avoids seeding local state from the query in an
  // effect).
  const [draft, setDraft] = useState<string | null>(null);
  const savedBio = profileQuery.data?.bio ?? "";
  const bio = draft ?? savedBio;
  const [usernameDraft, setUsernameDraft] = useState<string | null>(null);
  const currentUsername = profileQuery.data?.username ?? "";
  const username = usernameDraft ?? currentUsername;
  // True once the username field has been touched (typed in or blurred) once —
  // gates the live format error so it doesn't show before the user has done
  // anything (D8: validate on every keystroke once touched, not only on submit).
  const [usernameTried, setUsernameTried] = useState(false);
  // Server-side error only (409-taken, or any other backend failure from the
  // last submit attempt) — the format error is derived live below instead of
  // being stored here.
  const [usernameServerError, setUsernameServerError] = useState<string | null>(
    null,
  );
  // Stays true until the next edit (bio or username) — an inline confirmation,
  // not a toast, per the mock's "stays until the next edit" spec. Unlike
  // CreatePackForm's `justSaved` this deliberately has no auto-revert timer.
  const [saved, setSaved] = useState(false);

  const saveMutation = useUpdateBio(user?.id ?? "");
  const changeUsername = useChangeUsername(user?.id ?? "");
  const pending = saveMutation.isPending || changeUsername.isPending;
  const saveError = saveMutation.isError
    ? messageFromError(saveMutation.error, { fallback: t("saveError") })
    : null;

  const trimmedUsername = username.trim();
  const usernameDirty = trimmedUsername !== currentUsername;
  const bioDirty = bio !== savedBio;
  const dirty = bioDirty || usernameDirty;
  const usernameFormatInvalid =
    usernameDirty && !USERNAME_PATTERN.test(trimmedUsername);
  const usernameFormatError =
    usernameTried && usernameFormatInvalid ? tAuthErrors("username") : null;
  const usernameError = usernameServerError ?? usernameFormatError;
  const canSave = dirty && !usernameFormatInvalid;

  const cancelHref = user ? `/users/${user.id}` : "/profile";

  function handleBioChange(event: React.ChangeEvent<HTMLTextAreaElement>) {
    setDraft(event.target.value.slice(0, BIO_MAX));
    setSaved(false);
  }

  function handleUsernameChange(event: React.ChangeEvent<HTMLInputElement>) {
    setUsernameDraft(event.target.value.slice(0, USERNAME_MAX));
    setUsernameTried(true);
    setUsernameServerError(null);
    setSaved(false);
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setUsernameServerError(null);
    saveMutation.reset();

    const nextUsername = username.trim();
    // Only touch the username endpoint when it actually changed; validate the
    // format client-side first so an obviously bad handle never round-trips.
    if (nextUsername !== currentUsername) {
      if (!USERNAME_PATTERN.test(nextUsername)) {
        setUsernameTried(true);
        return;
      }
      try {
        await changeUsername.mutateAsync(nextUsername);
        // Reflect the new handle in header chrome immediately.
        patchUser({ username: nextUsername });
      } catch (err) {
        setUsernameServerError(
          err instanceof ApiError && err.status === 409
            ? t("usernameTaken")
            : messageFromError(err, { fallback: t("saveError") }),
        );
        return;
      }
    }

    // Stay on the page and show an inline "Saved" confirmation instead of
    // navigating away — the mock's preview card (T10) needs the draft state to
    // stick around, and a redirect-on-save would give the confirmation no time
    // to be seen at all.
    saveMutation.mutate(bio, {
      onSuccess: () => setSaved(true),
    });
  }

  if (authStatus === "loading") return null;

  if (authStatus === "unauthenticated") {
    return (
      <div className="mx-auto max-w-md py-16 text-center">
        <Text variant="secondary">{t("loginRequiredEdit")}</Text>
      </div>
    );
  }

  if (profileQuery.isLoading) return null;

  if (profileQuery.isError) {
    return (
      <div className="mx-auto max-w-md py-16 text-center">
        <Text variant="danger">{t("loadBioError")}</Text>
      </div>
    );
  }

  return (
    <>
      {/* The shared header, which is full-bleed by design. It used to wrap its
          contents in `pageContainer(680)`, which indented the back pill to the
          centre column — on a wide viewport that left it stranded ~360px from
          the edge while every other page's header started at the gutter. The
          `crumb` is a breadcrumb, not the page heading: the <h1> is in the form
          below, and two would leave the page with no single document title. */}
      <PageHeader
        back={{ href: cancelHref, label: t("backToProfile") }}
        crumb={t("editProfile")}
      />

      <form
        onSubmit={handleSubmit}
        className={cn(
          pageContainer(680),
          "flex flex-col gap-[26px] pt-[30px] pb-[70px]",
        )}
      >
        <h1 className="text-[26px] font-bold tracking-[-0.02em] text-foreground">
          {t("editProfile")}
        </h1>

        {profileQuery.data && (
          <AvatarSection
            userId={user?.id ?? ""}
            username={profileQuery.data.username}
            avatarKey={profileQuery.data.avatarKey ?? null}
          />
        )}

        <section className="flex flex-col gap-2">
          <div className="flex items-baseline justify-between gap-2.5">
            <label htmlFor="profile-username" className={FIELD_LABEL}>
              {tAuth("username")}
            </label>
            <span data-mono className="text-[11.5px] text-foreground-tertiary">
              {username.length}/{USERNAME_MAX}
            </span>
          </div>
          {/* The "@" and the CHANGED pill live INSIDE the field box, so the
              control reads as one unit rather than a label with decorations
              floating beside it. */}
          <div
            className={cn(
              "flex h-12 items-center gap-2.5 rounded-[11px] border bg-surface-card px-[13px] transition-colors focus-within:border-acc",
              usernameError ? "border-danger/50" : "border-white/10",
            )}
          >
            <span aria-hidden className="text-sm text-foreground-tertiary">
              @
            </span>
            <input
              id="profile-username"
              type="text"
              value={username}
              onChange={handleUsernameChange}
              onBlur={() => setUsernameTried(true)}
              maxLength={USERNAME_MAX}
              autoComplete="username"
              className="min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-foreground-tertiary"
            />
            {usernameDirty && (
              <span className="flex-none rounded-[6px] bg-status-pending/[0.14] px-2 py-0.5 text-[10px] font-bold tracking-[0.04em] text-status-pending">
                {t("usernameChangedPill")}
              </span>
            )}
          </div>
          {/* The rule is shown either way: as an error once you've broken it,
              as a hint before you have. A field whose constraint only appears
              after a failure makes you guess.
              The rule itself is `auth.errors.username` — the SAME string the
              validator rejects with — rather than a second copy that could
              drift from USERNAME_PATTERN (it already had: a hand-written hint
              said "letters and numbers only" while the pattern allows
              underscores). `usernameHint` carries only the consequence. */}
          {usernameError ? (
            <Text variant="danger" className="text-[12.5px] font-semibold">
              {usernameError}
            </Text>
          ) : (
            <Text variant="tertiary" className="text-xs leading-[1.5]">
              {tAuthErrors("username")} {t("usernameHint")}
            </Text>
          )}
        </section>

        <section className="flex flex-col gap-2">
          <div className="flex items-baseline justify-between gap-2.5">
            <label htmlFor="profile-bio" className={FIELD_LABEL}>
              {t("bio")}
            </label>
            <span data-mono className="text-[11.5px] text-foreground-tertiary">
              {bio.length}/{BIO_MAX}
            </span>
          </div>
          <textarea
            id="profile-bio"
            value={bio}
            onChange={handleBioChange}
            maxLength={BIO_MAX}
            rows={4}
            placeholder={t("bioPlaceholder")}
            className="resize-y rounded-[11px] border border-white/10 bg-surface-card p-[13px] text-sm leading-[1.6] text-foreground outline-none transition-colors placeholder:text-foreground-tertiary focus-visible:border-acc"
          />
        </section>

        <ProfileEditPreview
          username={username}
          bio={bio}
          role={profileQuery.data?.role}
          trusted={profileQuery.data?.trusted}
          avatarKey={profileQuery.data?.avatarKey}
        />

        {saveError && (
          <Text variant="danger" className="text-sm">
            {saveError}
          </Text>
        )}

        <div className="flex flex-wrap items-center gap-[11px]">
          <Button type="submit" loading={pending} disabled={!canSave}>
            {pending ? t("saving") : t("save")}
          </Button>
          <Link href={cancelHref} className={buttonClassName("outline")}>
            {t("cancel")}
          </Link>
          {saved && (
            <p
              role="status"
              className="flex items-center gap-[7px] text-[13px] font-[650] text-[#7ee7b4]"
            >
              <Check size={15} strokeWidth={2.6} aria-hidden />
              {t("editSaved")}
            </p>
          )}
        </div>
      </form>
    </>
  );
}
