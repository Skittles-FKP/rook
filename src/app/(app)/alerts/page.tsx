import { AlertPreferences } from "@/components/agents/alert-preferences";
import { NotificationFeed } from "@/components/agents/notification-feed";
import { PageHeader } from "@/components/shell/page-header";
import { getAutonomousIntelligence } from "@/lib/agents";
import { getOperatorNotifications } from "@/lib/data/notifications";

export default async function AlertsPage() {
  const [system, alerts] = await Promise.all([getAutonomousIntelligence(), getOperatorNotifications()]);

  return (
    <>
      <PageHeader
        eyebrow="Alerts"
        title="Operator notification layer"
        description="Subscribe to narratives, Flocks, anomaly events, Pulse categories, and autonomous agent escalations."
      />
      <section className="grid gap-4 px-4 py-5 sm:px-6 lg:grid-cols-[0.82fr_1fr] lg:px-8">
        <AlertPreferences preferences={system.alerts} />
        <NotificationFeed initialAlerts={alerts} />
      </section>
    </>
  );
}
