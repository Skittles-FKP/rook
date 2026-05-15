import { RookBirdIcon } from "@/components/brand";

export default function Loading() {
  return (
    <div className="grid min-h-[60vh] place-items-center px-4">
      <div className="surface-card rounded-xl p-6 text-center">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-xl border border-white/10 bg-rook-graphite">
          <RookBirdIcon className="h-12 w-12 animate-rook-pulse" />
        </div>
        <p className="mt-4 text-xs font-black uppercase tracking-[0.24em] text-rook-cyan">
          Syncing intelligence surface
        </p>
      </div>
    </div>
  );
}
