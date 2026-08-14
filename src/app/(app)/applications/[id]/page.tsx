import { notFound } from "next/navigation";
import { ApplicationDetail } from "@/components/application-detail";
import { isAiConfigured } from "@/lib/ai/model";
import { getApplication } from "@/lib/data/applications";
import { listFriendships } from "@/lib/data/friends";
import { listTouchpoints } from "@/lib/data/touchpoints";
import { otherPartyHandle, otherPartyId } from "@/lib/friends";
import { isApolloConfigured } from "@/lib/outreach/apollo";
import { getUser } from "@/lib/supabase/server";

export default async function ApplicationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getUser();

  const application = await getApplication(id);
  if (!application) notFound();

  const [touchpoints, friendships] = await Promise.all([
    listTouchpoints({ applicationId: id }),
    listFriendships().catch(() => []),
  ]);

  const friends = user
    ? friendships
        .filter((f) => f.status === "accepted")
        .map((f) => ({
          userId: otherPartyId(user.id, f),
          handle: otherPartyHandle(user.id, f) ?? "Friend",
        }))
    : [];

  return (
    <ApplicationDetail
      application={application}
      touchpoints={touchpoints}
      apolloEnabled={isApolloConfigured}
      aiEnabled={isAiConfigured}
      friends={friends}
    />
  );
}
