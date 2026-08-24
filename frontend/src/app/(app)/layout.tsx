import { redirect } from "next/navigation";
import { claimLegacyData, getUser } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { countIncomingInvites } from "@/lib/data/friends";
import { countUnreadNotifications } from "@/lib/data/notifications";
import { countPendingPodInvites } from "@/lib/data/pods";
import { countDueFollowUps } from "@/lib/data/touchpoints";
import { listResumes } from "@/lib/data/resumes";
import { AppShellProvider } from "@/components/app-shell-provider";
import { MobileNav } from "@/components/mobile-nav";
import { TopBar } from "@/components/top-bar";
import { SetupNotice } from "@/components/setup-notice";
import { UsernameSetup } from "@/components/username-setup";

export const dynamic = "force-dynamic";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!isSupabaseConfigured) {
    return (
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-10 sm:px-6">
        <SetupNotice />
      </main>
    );
  }

  const user = await getUser();
  if (!user) redirect("/sign-in");

  await claimLegacyData();

  if (!user.username) {
    return (
      <main className="mx-auto w-full max-w-[1600px] flex-1 px-4 py-5 sm:px-6">
        <UsernameSetup />
      </main>
    );
  }

  const [followUpCount, bellCount, resumes] = await Promise.all([
    countDueFollowUps().catch(() => 0),
    Promise.all([
      countIncomingInvites(user.id).catch(() => 0),
      countPendingPodInvites(user.id).catch(() => 0),
      countUnreadNotifications().catch(() => 0),
    ]).then((n) => n.reduce((a, b) => a + b, 0)),
    listResumes().catch(() => []),
  ]);

  return (
    <AppShellProvider resumeOptions={resumes.map((r) => r.label)}>
      <TopBar
        email={user.email}
        name={user.name}
        username={user.username}
        followUpCount={followUpCount}
        bellCount={bellCount}
      />
      <main className="mx-auto w-full max-w-[1600px] flex-1 px-4 py-5 pb-24 sm:px-6 lg:pb-5">
        {children}
      </main>
      <MobileNav followUpCount={followUpCount} />
    </AppShellProvider>
  );
}
