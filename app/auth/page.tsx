import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthForm } from "@/src/features/auth/AuthForm";
import { AuthBrandPanel } from "@/src/features/auth/AuthBrandPanel";
import { getUserCountServer } from "@/src/shared/lib/get-user-count-server";

export const metadata: Metadata = {
  title: "Log in or sign up",
};

export default async function AuthPage() {
  // Live registered-user count for the brand panel's social-proof line; null
  // (and a neutral fallback line) if the backend count is unavailable.
  const userCount = await getUserCountServer();

  return (
    <main className="grid min-h-screen grid-cols-1 min-[900px]:grid-cols-[1.05fr_minmax(0,1fr)]">
      <AuthBrandPanel count={userCount} />
      <div className="flex items-center justify-center px-7 py-16">
        {/* AuthForm reads ?next= via useSearchParams(), which requires a
            Suspense boundary to prerender — otherwise the build fails. */}
        <Suspense>
          <AuthForm />
        </Suspense>
      </div>
    </main>
  );
}
