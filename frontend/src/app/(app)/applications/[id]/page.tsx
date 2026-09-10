import { notFound } from "next/navigation";
import { ApplicationDetail } from "@/components/application-detail";
import { isAiConfigured } from "@/lib/ai/model";
import { getApplication } from "@/lib/data/applications";
import { listFriendships, listThreads } from "@/lib/data/friends";
import { listPods } from "@/lib/data/pods";
import { listTouchpoints } from "@/lib/data/touchpoints";
import { otherPartyHandle, otherPartyId, sharesForApplication } from "@/lib/friends";
import { isApolloConfigured } from "@/lib/outreach/apollo";
import { getUser } from "@/lib/supabase/server";

export default async function ApplicationDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { id } = await params;
  const { tab } = await searchParams;
  const user = await getUser();

  const application = await getApplication(id);
  if (!application) notFound();

  const [touchpoints, friendships, pods, threads] = await Promise.all([
    listTouchpoints({ applicationId: id }),
    listFriendships().catch(() => []),
    listPods().catch(() => []),
    listThreads().catch(() => []),
  ]);

  const friends = user
    ? friendships
        .filter((f) => f.status === "accepted")
        .map((f) => ({
          userId: otherPartyId(user.id, f),
          handle: otherPartyHandle(user.id, f) ?? "Friend",
        }))
    : [];
  const shares = user
    ? sharesForApplication(user.id, application, threads, friendships)
    : [];

  return (
    <ApplicationDetail
      application={application}
      touchpoints={touchpoints}
      apolloEnabled={isApolloConfigured}
      aiEnabled={isAiConfigured}
      friends={friends}
      pods={pods.map((p) => ({ id: p.id, name: p.name }))}
      shares={shares}
      initialTab={tab === "outreach" || tab === "activity" ? "outreach" : "overview"}
    />
  );
}
