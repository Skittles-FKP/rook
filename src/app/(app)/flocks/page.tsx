export const runtime = "edge";

import { UsersRound } from "lucide-react";
import { PageHeader } from "@/components/shell/page-header";
import { FlockComposer } from "@/components/flocks/flock-composer";
import { FlockMembershipButton } from "@/components/flocks/flock-actions";
import { getFlocks } from "@/lib/data/flocks";

export default async function FlocksPage() {
  const flocks = await getFlocks();

  return (
    <>
      <PageHeader
        eyebrow="Flocks"
        title="Domain networks"
        description="Create and join Flocks that organise Signals around high-velocity domains."
      />
      <section className="grid gap-4 px-4 py-5 sm:px-6 lg:grid-cols-3 lg:px-8">
        <FlockComposer />
        {flocks.length === 0 && (
          <div className="surface-card rounded-xl p-8 text-center lg:col-span-3">
            <p className="text-lg font-black text-white">No Flocks yet</p>
            <p className="mt-2 text-sm text-rook-muted">Create the first domain network.</p>
          </div>
        )}
        {flocks.map((flock) => (
          <article key={flock.name} className="surface-card rounded-xl p-5">
            <div className="grid h-12 w-12 place-items-center rounded-lg bg-gradient-to-br from-rook-blue/40 to-rook-violet/40 text-rook-cyan">
              <UsersRound className="h-6 w-6" />
            </div>
            <h2 className="mt-5 text-xl font-black text-white">{flock.name}</h2>
            <p className="mt-2 text-sm leading-6 text-rook-muted">
              {flock.description ?? "No description yet."}
            </p>
            <div className="mt-5 flex items-center justify-between border-t border-white/10 pt-4 text-sm">
              <span className="font-bold text-white">{flock.members_count} members</span>
              <FlockMembershipButton flockId={flock.id} joined={flock.viewer_is_member} />
            </div>
          </article>
        ))}
      </section>
    </>
  );
}
