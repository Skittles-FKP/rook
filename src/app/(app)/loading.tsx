import { RookBirdIcon } from "@/components/brand";

export default function Loading() {
  return (
    <div className="mx-auto grid w-full max-w-5xl gap-4 px-3 py-5 sm:px-6 lg:px-8">
      <div className="surface-card rounded-xl p-5">
        <div className="flex items-center gap-3">
          <div className="grid h-14 w-14 place-items-center rounded-xl border border-white/10 bg-rook-graphite">
          <RookBirdIcon className="h-12 w-12 animate-rook-pulse" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-black uppercase tracking-[0.24em] text-rook-cyan">Syncing intelligence surface</p>
            <div className="mt-3 h-3 w-2/3 rounded-full bg-white/[0.07]" />
          </div>
        </div>
      </div>
      <div className="grid gap-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="surface-card overflow-hidden rounded-xl p-4">
            <div className="flex gap-3">
              <div className="h-11 w-11 rounded-xl bg-white/[0.07]" />
              <div className="min-w-0 flex-1">
                <div className="h-3 w-36 rounded-full bg-white/[0.07]" />
                <div className="mt-3 h-5 w-4/5 rounded-full bg-white/[0.07]" />
                <div className="mt-3 h-3 w-full rounded-full bg-white/[0.055]" />
                <div className="mt-2 h-3 w-2/3 rounded-full bg-white/[0.055]" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
