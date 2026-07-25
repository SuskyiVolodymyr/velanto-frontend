import Link from "next/link";
import { useTranslations } from "next-intl";
import { Text } from "@/src/shared/components/Text";
import { BrandMark } from "@/src/shared/components/BrandMark";
import { SUPPORT_EMAIL } from "@/src/shared/lib/contact";

// Reuses the header's nav labels so the two never drift; only the footer-only
// bits (tagline, copyright, legal links) come from the `footer` namespace.
const NAV_LINKS: { href: string; ns: "header" | "footer"; key: string }[] = [
  { href: "/", ns: "header", key: "browse" },
  { href: "/feedback", ns: "header", key: "feedback" },
  { href: "/rules", ns: "header", key: "rules" },
  { href: "/docs", ns: "header", key: "docs" },
  { href: "/updates", ns: "footer", key: "updates" },
  { href: "/privacy", ns: "footer", key: "privacy" },
  { href: "/terms", ns: "footer", key: "terms" },
];

export function SiteFooter() {
  const tHeader = useTranslations("header");
  const tFooter = useTranslations("footer");
  // Rendered inside the client <AppShell>, so this is compiled into the client
  // bundle (not a Server Component). next-intl's isomorphic useTranslations
  // resolves fine there. The year is still computed at render — it matches
  // between SSR and hydration except at the exact New Year rollover, which is
  // acceptable for a footer copyright.
  const year = new Date().getFullYear();

  return (
    <footer className="mt-auto border-t border-border bg-background/60">
      <div className="mx-auto flex w-full max-w-[1120px] flex-col gap-6 px-7 py-10 sm:flex-row sm:items-start sm:justify-between">
        <div className="max-w-xs">
          <Link href="/" className="flex items-center gap-2.5">
            <BrandMark className="h-5 w-5" />
            <Text
              as="span"
              variant="title"
              className="text-[17px] tracking-[0.2em]"
            >
              VELANTO
            </Text>
          </Link>
          <Text variant="tertiary" className="mt-3 text-sm">
            {tFooter("tagline")}
          </Text>
          {/*
            The only contact route on the platform, and what both legal
            documents point at — so it has to be reachable from any page, not
            just from inside those documents. Not a nav link: it's an address,
            and the address is the information.
          */}
          <Text variant="tertiary" className="mt-3 text-sm">
            {tFooter("contactLabel")}{" "}
            <a
              href={`mailto:${SUPPORT_EMAIL}`}
              className="text-foreground-secondary underline transition-colors hover:text-foreground"
            >
              {SUPPORT_EMAIL}
            </a>
          </Text>
        </div>

        <nav
          aria-label={tFooter("navLabel")}
          className="grid grid-cols-2 gap-x-10 gap-y-2.5 text-sm"
        >
          {NAV_LINKS.map(({ href, ns, key }) => (
            <Link
              key={href}
              href={href}
              className="text-foreground-secondary transition-colors hover:text-foreground"
            >
              {ns === "header" ? tHeader(key) : tFooter(key)}
            </Link>
          ))}
        </nav>
      </div>

      <div className="border-t border-border/60 px-7 py-5">
        <Text
          variant="tertiary"
          className="mx-auto w-full max-w-[1120px] text-xs"
        >
          {tFooter("copyright", { year })}
        </Text>
      </div>
    </footer>
  );
}
