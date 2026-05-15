export const runtime = "edge";

import { notFound } from "next/navigation";
import { PageHeader } from "@/components/shell/page-header";
import { ProfileView } from "@/components/profile/profile-view";
import { getProfileSummary } from "@/lib/data/profiles";
import { getViewer } from "@/lib/data/signals";

export default async function PublicProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const [{ username }, { user }] = await Promise.all([params, getViewer()]);
  const profile = await getProfileSummary(username);

  if (!user || !profile) {
    notFound();
  }

  return (
    <>
      <PageHeader
        eyebrow="Profile"
        title={profile.display_name}
        description={`@${profile.username} on the Rook intelligence network.`}
      />
      <ProfileView profile={profile} viewerId={user.id} />
    </>
  );
}
