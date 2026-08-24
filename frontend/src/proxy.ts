import { clerkMiddleware } from "@clerk/nextjs/server";

/**
 * Clerk still needs this to attach the session. Product routes are gated in
 * `(app)/layout.tsx`, so `/` stays the public landing.
 */
export const proxy = clerkMiddleware();

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
    "/__clerk/:path*",
  ],
};
