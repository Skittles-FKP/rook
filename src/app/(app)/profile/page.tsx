import { notFound } from "next/navigation";
import { PageHeader } from "@/components/shell/page-header";
import { ProfileView } from "@/components/profile/profile-view";
import { getViewer } from "@/lib/data/signals";
import { getCurrentProfileSummary } from "@/lib/data/profiles";

export default async function ProfilePage() {
  const [{ user }, profile] = await Promise.all([getViewer(), getCurrentProfileSummary()]);

  if (!user || !profile) {
    notFound();
  }

  return (
    <>
      <PageHeader
        eyebrow="Profile"
        title="Operator identity"
        description="Your Signals, follows, Flocks, and reputation are anchored to this profile."
      />
      <ProfileView profile={profile} viewerId={user.id} />
    </>
  );
}
