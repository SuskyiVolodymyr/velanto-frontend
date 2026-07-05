import type { Metadata } from "next";
import { AuthForm } from "@/src/features/auth/AuthForm";

export const metadata: Metadata = {
  title: "Log in or sign up",
};

export default function AuthPage() {
  return (
    <main className="flex flex-1 items-center justify-center px-7 py-16">
      <AuthForm />
    </main>
  );
}
