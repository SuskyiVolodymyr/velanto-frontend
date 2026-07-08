import { Text } from "@/src/shared/components/Text";
import { AppearanceSection } from "@/src/features/settings/AppearanceSection";
import { NotificationsSection } from "@/src/features/settings/NotificationsSection";
import { AccountSection } from "@/src/features/settings/AccountSection";

export function SettingsScreen() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-10 px-7 py-10">
      <Text as="h1" variant="title" className="text-3xl">
        Preferences
      </Text>
      <AppearanceSection />
      <NotificationsSection />
      <AccountSection />
    </main>
  );
}
