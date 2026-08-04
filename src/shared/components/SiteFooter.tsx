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
    // Single tier. This used to be two — a tall brand/nav block over its own
    // bordered copyright bar, ~210px — which was affordable as Dashboard-only
    // chrome and is not now that it sits under every page. Folding the
    // copyright up into the brand column removes a border, a wrapper and a
    // second set of vertical padding without dropping any content.
    <footer className="mt-auto border-t border-border bg-background/60">
      <div className="mx-auto flex w-full max-w-[1120px] flex-col gap-5 px-7 py-6 sm:flex-row sm:items-start sm:justify-between">
        <div className="max-w-xs">
          <Link href="/" className="flex items-center gap-2">
            <BrandMark className="h-[18px] w-[18px]" />
            <Text
              as="span"
              variant="title"
              className="text-[15px] tracking-[0.2em]"
            >
              VELANTO
            </Text>
          </Link>
          <Text variant="tertiary" className="mt-2 text-xs">
            {tFooter("tagline")}
          </Text>
          {/*
            The only contact route on the platform, and what both legal
            documents point at — so it has to be reachable from any page, not
            just from inside those documents. Not a nav link: it's an address,
            and the address is the information. Now shares a line with the
            copyright, which is why the separator is decorative-only.
          */}
          <Text variant="tertiary" className="mt-2 text-xs">
            {tFooter("copyright", { year })}
            <span aria-hidden> · </span>
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
          className="grid grid-cols-2 gap-x-10 gap-y-1.5 text-[13px]"
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
    </footer>
  );
}
