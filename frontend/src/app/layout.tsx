import { ClerkProvider } from "@clerk/nextjs";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { clerkAppearance } from "@/lib/clerk-appearance";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const siteUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Pipeline: Track the search, not the spreadsheet",
    template: "%s · Pipeline",
  },
  description:
    "Paste a job posting, log the outreach, and run a daily plan. Pipeline is a job search tracker that counts itself.",
  openGraph: {
    title: "Pipeline: Track the search, not the spreadsheet",
    description:
      "Paste a job posting, log the outreach, and run a daily plan that counts itself.",
    type: "website",
    siteName: "Pipeline",
  },
  twitter: {
    card: "summary_large_image",
    title: "Pipeline: Track the search, not the spreadsheet",
    description:
      "Paste a job posting, log the outreach, and run a daily plan that counts itself.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-background text-text">
        <ClerkProvider
          appearance={clerkAppearance}
          signInUrl="/sign-in"
          signUpUrl="/sign-up"
          afterSignOutUrl="/"
          signInFallbackRedirectUrl="/today"
          signUpFallbackRedirectUrl="/today"
          taskUrls={{
            "choose-organization": "/auth/choose-organization",
            "reset-password": "/auth/reset-password",
            "setup-mfa": "/auth/setup-mfa",
          }}
        >
          {children}
        </ClerkProvider>
      </body>
    </html>
  );
}
