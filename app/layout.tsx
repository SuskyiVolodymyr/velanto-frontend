import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AuthProvider } from "@/src/shared/lib/auth-context";
import { AppHeader } from "@/src/shared/components/AppHeader";
import { ThemeInitializer } from "@/src/shared/components/ThemeInitializer";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Velanto",
    template: "%s | Velanto",
  },
  description:
    "Velanto is an elimination-quiz-pack platform: create packs, play them solo or with others, and see who's left standing.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <ThemeInitializer />
        <AuthProvider>
          <AppHeader />
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
