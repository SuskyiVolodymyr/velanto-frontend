import Link from "next/link";
import { useTranslations } from "next-intl";
import { Text } from "@/src/shared/components/Text";

// App-wide 404, shown for any unmatched route (and for a `notFound()` call that
// no closer not-found boundary catches). Mirrors the per-route not-found pages.
export default function NotFound() {
  const t = useTranslations("pages");
  return (
    <div className="mx-auto max-w-md flex-1 py-16 text-center">
      <Text as="p" variant="tertiary" className="mb-2 text-5xl font-semibold">
        404
      </Text>
      <Text as="h1" variant="title" className="mb-2 text-2xl">
        {t("notFoundTitle")}
      </Text>
      <Text variant="secondary" className="mb-6">
        {t("notFoundBody")}
      </Text>
      <Link href="/" className="text-acc hover:underline">
        {t("backToDiscover")}
      </Link>
    </div>
  );
}
