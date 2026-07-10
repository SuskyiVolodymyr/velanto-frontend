import Link from "next/link";
import { useTranslations } from "next-intl";
import { Text } from "@/src/shared/components/Text";

export default function UserNotFound() {
  const t = useTranslations("pages");
  return (
    <div className="mx-auto max-w-md py-16 text-center">
      <Text as="h1" variant="title" className="mb-2 text-2xl">
        {t("userNotFound")}
      </Text>
      <Text variant="secondary" className="mb-6">
        {t("userNotFoundBody")}
      </Text>
      <Link href="/" className="text-acc hover:underline">
        {t("backToDiscover")}
      </Link>
    </div>
  );
}
