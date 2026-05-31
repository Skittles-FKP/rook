export function PageHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <section className="border-b border-white/10 bg-rook-void px-4 py-5 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-rook-cyan">
            {eyebrow}
          </p>
          <h1 className="mt-2 text-3xl font-black tracking-normal text-white sm:text-4xl">
            {title}
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-rook-muted sm:text-base">
            {description}
          </p>
        </div>
        {action}
      </div>
    </section>
  );
}
