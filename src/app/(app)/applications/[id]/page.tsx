import { notFound } from "next/navigation";
import { ApplicationDetail } from "@/components/application-detail";
import { isAiConfigured } from "@/lib/ai/model";
import { getApplication } from "@/lib/data/applications";
import { listTouchpoints } from "@/lib/data/touchpoints";
import { isApolloConfigured } from "@/lib/outreach/apollo";

export default async function ApplicationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const application = await getApplication(id);
  if (!application) notFound();

  const touchpoints = await listTouchpoints({ applicationId: id });

  return (
    <ApplicationDetail
      application={application}
      touchpoints={touchpoints}
      apolloEnabled={isApolloConfigured}
      aiEnabled={isAiConfigured}
    />
  );
}
