import { Activity, DoorOpen, UsersRound } from "lucide-react";
import { LiveRoomPresence } from "@/components/graph/live-room-presence";
import { PageHeader } from "@/components/shell/page-header";
import { getIntelligenceGraph } from "@/lib/intelligence";

export default async function RoomsPage() {
  const graph = await getIntelligenceGraph();

  return (
    <>
      <PageHeader
        eyebrow="Rooms"
        title="Realtime collaboration rooms"
        description="Shared intelligence spaces for operators coordinating around Flocks, Pulse movement, and collaborative Brief generation."
      />
      <section className="grid gap-4 px-4 py-5 sm:px-6 lg:grid-cols-2 lg:px-8">
        {graph.collaborationRooms.length === 0 && (
          <div className="surface-card rounded-xl p-8 text-center lg:col-span-2">
            <p className="text-lg font-black text-white">No rooms active</p>
            <p className="mt-2 text-sm text-rook-muted">Create or join Flocks to open shared intelligence rooms.</p>
          </div>
        )}
        {graph.collaborationRooms.map((room) => (
          <article key={room.id} className="surface-card rounded-xl p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="grid h-11 w-11 place-items-center rounded-lg bg-rook-blue/15 text-rook-cyan">
                <DoorOpen className="h-5 w-5" />
              </div>
              <LiveRoomPresence roomId={room.id} />
            </div>
            <h2 className="mt-5 text-xl font-black text-white">{room.name}</h2>
            <p className="mt-2 text-sm leading-6 text-rook-muted">{room.detail}</p>
            <div className="mt-5 grid grid-cols-3 gap-2">
              <RoomMetric icon={UsersRound} label="Operators" value={room.operators} />
              <RoomMetric icon={Activity} label="Signals" value={room.signal_count} />
              <RoomMetric icon={Activity} label="Pulse" value={room.pulse_score} />
            </div>
            <div className="mt-5 rounded-lg border border-white/10 bg-white/[0.035] p-3">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-rook-cyan">
                Brief Collaboration
              </p>
              <p className="mt-2 text-sm leading-6 text-rook-muted">
                Operators in this room share the same Pulse context, source Signals, and Brief synthesis queue.
              </p>
            </div>
          </article>
        ))}
      </section>
    </>
  );
}

function RoomMetric({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.035] p-3 text-center">
      <Icon className="mx-auto h-4 w-4 text-rook-cyan" />
      <p className="mt-2 text-lg font-black text-white">{value}</p>
      <p className="mt-1 text-[11px] font-bold text-rook-muted">{label}</p>
    </div>
  );
}
