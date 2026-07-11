import { useTranslations } from "next-intl";
import { Text } from "@/src/shared/components/Text";

/** Note shown on a result screen when picks come from a shared `?p=` link
 *  (the viewer is looking at someone else's result, not their own). */
export function SharedResultNote() {
  const t = useTranslations("result");
  return (
    <Text
      variant="secondary"
      className="mb-6 rounded-[10px] border border-border bg-surface px-4 py-2 text-sm"
    >
      {t("sharedNote")}
    </Text>
  );
}
