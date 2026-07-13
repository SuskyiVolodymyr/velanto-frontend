"use client";

import { useRouter, usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { useForm, useWatch, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuth } from "@/src/shared/lib/auth-context";
import { packsClient } from "@/src/shared/lib/packs-client";
import type { CreatePackInput } from "@/src/shared/lib/packs-client";
import { messageFromError } from "@/src/shared/lib/messageFromError";
import { COVER_TONES } from "@/src/shared/types/pack";
import { Button } from "@/src/shared/components/Button";
import { Text } from "@/src/shared/components/Text";
import { PackMetaFields } from "@/src/features/create/PackMetaFields";
import { FormatSection } from "@/src/features/create/FormatSection";
import { GroupsSection } from "@/src/features/create/GroupsSection";
import { CategoriesSection } from "@/src/features/create/CategoriesSection";
import {
  newGroup,
  newCategory,
} from "@/src/features/create/create-pack.defaults";
import {
  createPackSchema,
  type CreatePackValues,
} from "@/src/features/create/create-pack.schema";

export function CreatePackForm() {
  const t = useTranslations("create");
  const router = useRouter();
  const pathname = usePathname();
  const { status } = useAuth();

  const methods = useForm<CreatePackValues>({
    resolver: zodResolver(createPackSchema),
    defaultValues: {
      title: "",
      description: "",
      coverTone: COVER_TONES[0],
      tags: [],
      format: "save_one",
      groups: [newGroup()],
      categories: [newCategory(), newCategory()],
      versusRounds: undefined,
      versusN: undefined,
    },
  });
  const {
    control,
    handleSubmit,
    setError,
    formState: { isSubmitting, errors },
  } = methods;

  // The one subscription the orchestrator needs itself: which body (Groups vs
  // Categories) to render. Each section subscribes to its own slices internally.
  const format = useWatch({ control, name: "format" });

  async function onValid(values: CreatePackValues) {
    const base = {
      title: values.title,
      description: values.description,
      coverTone: values.coverTone,
      format: values.format,
      tags: values.tags,
    };
    const input: CreatePackInput =
      values.format === "nxn"
        ? {
            ...base,
            categories: values.categories,
            versusRounds: values.versusRounds,
            versusN: values.versusN,
          }
        : { ...base, groups: values.groups };

    try {
      const pack = await packsClient.create(input);
      router.push(`/packs/${pack.id}`);
    } catch (err) {
      setError("root", { message: messageFromError(err) });
    }
  }

  if (status === "loading") return null;

  if (status === "unauthenticated") {
    return (
      <div className="mx-auto max-w-md py-16 text-center">
        <Text variant="secondary">{t("loginRequired")}</Text>
        <Button
          className="mt-4"
          onClick={() =>
            router.push(`/auth?next=${encodeURIComponent(pathname)}`)
          }
        >
          {t("logIn")}
        </Button>
      </div>
    );
  }

  return (
    <FormProvider {...methods}>
      <form
        onSubmit={handleSubmit(onValid)}
        noValidate
        className="flex flex-col gap-8"
      >
        <PackMetaFields />

        <FormatSection />

        {format === "nxn" ? <CategoriesSection /> : <GroupsSection />}

        {errors.root?.message && (
          <Text role="alert" className="text-sm text-danger">
            {errors.root.message}
          </Text>
        )}

        <Button
          type="submit"
          loading={isSubmitting}
          className="h-[50px] w-full"
        >
          {isSubmitting ? t("publishing") : t("publish")}
        </Button>
      </form>
    </FormProvider>
  );
}
