import Link from "next/link";

export function RookBirdIcon({ className = "h-10 w-10" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true" className={className}>
      <path
        d="M12 42 28 10l24 8-8 9 9 9-20 18-7-16-14 4Z"
        fill="rgba(37,99,235,0.10)"
        stroke="#2563EB"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path d="M28 10v28l16-11 8-9-24-8Z" fill="rgba(15,23,42,0.10)" />
      <path d="M26 38 12 42l21 12-7-16Z" fill="rgba(37,99,235,0.18)" />
      <path d="M37 20h4" stroke="#0F172A" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function RookMark({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/" className="focus-ring flex items-center gap-3 rounded-lg">
      <span className="relative grid h-10 w-10 place-items-center overflow-hidden rounded-lg border border-white/10 bg-rook-graphite shadow-glow">
        <RookBirdIcon className="relative h-8 w-8" />
      </span>
      {!compact && (
        <span className="flex flex-col leading-none">
          <span className="text-lg font-black tracking-normal text-white">Rook</span>
          <span className="mt-1 text-[10px] font-semibold uppercase tracking-[0.28em] text-rook-muted">
            Signal Network
          </span>
        </span>
      )}
    </Link>
  );
}
