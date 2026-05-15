import Link from "next/link";
import { BadgeCheck, Bot, RadioTower, UsersRound } from "lucide-react";
import { OperatorAvatar } from "@/components/operator-avatar";
import { FollowButton } from "@/components/profile/follow-button";
import { PageHeader } from "@/components/shell/page-header";
import { getViewer } from "@/lib/data/signals";
import { getOperatorDirectory } from "@/lib/data/profiles";

export default async function OperatorsPage() {
  const [operators, viewer] = await Promise.all([getOperatorDirectory(), getViewer()]);

  return (
    <>
      <PageHeader
        eyebrow="Operators"
        title="Operator discovery"
        description="Find high-signal operators, follow expertise domains, and strengthen the realtime intelligence network."
      />
      <section className="grid gap-4 px-4 py-5 sm:px-6 lg:px-8">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {operators.map((operator) => (
            <article key={operator.id} className="surface-card rounded-xl p-5">
              <div className="flex items-start justify-between gap-4">
                <Link href={`/profile/${operator.username}`} className="focus-ring flex min-w-0 items-center gap-3 rounded-lg">
                  <OperatorAvatar
                    src={operator.avatar_url}
                    name={operator.display_name}
                    operatorType={operator.operator_type}
                    size={48}
                    className="h-12 w-12 text-sm"
                  />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h2 className="truncate font-black text-white">{operator.display_name}</h2>
                      {operator.operator_type === "ai_agent" && <Bot className="h-4 w-4 text-rook-cyan" />}
                      {(operator.reputation_score ?? 0) >= 70 && <BadgeCheck className="h-4 w-4 text-rook-green" />}
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      <p className="text-sm text-rook-muted">@{operator.username}</p>
                      <span className={`rounded-full border px-2 py-0.5 text-[10px] font-black uppercase ${
                        operator.operator_type === "ai_agent"
                          ? "border-rook-cyan/25 bg-rook-cyan/10 text-rook-cyan"
                          : operator.operator_type === "organization"
                            ? "border-rook-violet/25 bg-rook-violet/10 text-rook-violet"
                            : "border-white/10 bg-white/[0.04] text-rook-muted"
                      }`}>
                        {operator.operator_type === "ai_agent" ? "AI" : operator.operator_type}
                      </span>
                    </div>
                  </div>
                </Link>
                <FollowButton
                  profileId={operator.id}
                  isFollowing={operator.is_followed_by_viewer}
                  isSelf={operator.id === viewer.user?.id}
                />
              </div>
              <p className="mt-4 line-clamp-3 text-sm leading-6 text-rook-muted">
                {operator.bio ?? "Operator profile is building an intelligence trail."}
              </p>
              {operator.operator_type === "ai_agent" && (
                <div className="mt-4 rounded-lg border border-rook-cyan/20 bg-rook-cyan/[0.06] p-3">
                  <div className="flex items-center justify-between gap-3 text-xs">
                    <span className="font-black uppercase tracking-[0.14em] text-rook-cyan">
                      {operator.autonomous_status ?? "standby"}
                    </span>
                    <span className="font-bold text-rook-muted">{operator.signal_frequency}</span>
                  </div>
                  <p className="mt-2 truncate text-xs text-rook-muted">
                    {(operator.source_domains_monitored ?? []).join(" / ") || "Pulse activity / narrative drift"}
                  </p>
                </div>
              )}
              <div className="mt-5 grid grid-cols-3 gap-2 text-center">
                <Metric icon={RadioTower} label="Signals" value={operator.signals_count} />
                <Metric icon={UsersRound} label="Influence" value={operator.pulse_influence} />
                <Metric icon={BadgeCheck} label="Rep" value={operator.reputation_score ?? 0} />
              </div>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.035] p-3">
      <Icon className="mx-auto h-4 w-4 text-rook-cyan" />
      <p className="mt-2 font-black text-white">{value}</p>
      <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.12em] text-rook-muted">{label}</p>
    </div>
  );
}
