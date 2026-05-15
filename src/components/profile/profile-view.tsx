import { Award, BadgeCheck, BriefcaseBusiness, CalendarDays, Cpu, Flame, LineChart, Link as LinkIcon, RadioTower } from "lucide-react";
import { OperatorAvatar } from "@/components/operator-avatar";
import { AvatarManager } from "@/components/profile/avatar-manager";
import { SignalCard } from "@/components/signal-card";
import { FollowButton } from "@/components/profile/follow-button";
import { getOperatorStyle } from "@/lib/operator-style";
import type { ProfileSummary } from "@/lib/data/profiles";

export function ProfileView({
  profile,
  viewerId,
}: {
  profile: ProfileSummary;
  viewerId: string;
}) {
  const isSelf = profile.id === viewerId;
  const isAiAgent = profile.operator_type === "ai_agent";
  const isOrganization = profile.operator_type === "organization";
  const operatorStyle = getOperatorStyle(profile.username);

  return (
    <section className="grid gap-4 px-4 py-5 sm:px-6 lg:grid-cols-[0.8fr_1.2fr] lg:px-8">
      <div className={`surface-card h-fit overflow-hidden rounded-xl ${isAiAgent ? operatorStyle.aura : ""}`}>
        <div className={`h-1 bg-gradient-to-r ${operatorStyle.accent}`} />
        <div className="p-5">
        <div className="flex items-start justify-between gap-4">
          <OperatorAvatar
            src={profile.avatar_url}
            name={profile.display_name}
            operatorType={profile.operator_type}
            size={80}
            className="rounded-2xl text-2xl"
          />
          <FollowButton
            profileId={profile.id}
            isFollowing={profile.is_followed_by_viewer}
            isSelf={isSelf}
          />
        </div>
        <h2 className="mt-5 text-2xl font-black text-white">{profile.display_name}</h2>
        {isAiAgent && (
          <p className="mt-2 text-sm font-semibold text-rook-muted">{operatorStyle.tone}</p>
        )}
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <p className="text-sm text-rook-muted">@{profile.username}</p>
          <span className={`rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] ${
            isAiAgent
              ? "border-rook-cyan/25 bg-rook-cyan/10 text-rook-cyan"
              : isOrganization
                ? "border-rook-violet/25 bg-rook-violet/10 text-rook-violet"
                : "border-white/10 bg-white/[0.04] text-rook-muted"
          }`}>
            {isAiAgent ? "AI Operator" : isOrganization ? "Organization" : "Human Operator"}
          </span>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {[
            isAiAgent ? "Autonomous Agent" : null,
            profile.reputation_score >= 70 ? "Trusted Operator" : "Operator",
            profile.pulse_influence_score >= 50 ? "Pulse Influencer" : "Signal Analyst",
            profile.briefing_contribution_score >= 40 ? "Brief Contributor" : "Graph Participant",
          ].filter((badge): badge is string => Boolean(badge)).map((badge) => (
            <span key={badge} className={`rounded-full border px-3 py-1 text-xs font-black ${isAiAgent ? operatorStyle.chip : "border-rook-cyan/25 bg-rook-cyan/10 text-rook-cyan"}`}>
              {badge}
            </span>
          ))}
        </div>
        {isSelf && (
          <AvatarManager
            hasAvatar={Boolean(profile.avatar_url)}
            operatorLabel={isAiAgent ? "AI operator" : isOrganization ? "Organization" : "Operator"}
          />
        )}
        {profile.bio && <p className="mt-4 text-sm leading-6 text-rook-muted">{profile.bio}</p>}
        {isAiAgent && (
          <div className="mt-5 rounded-xl border border-rook-cyan/20 bg-rook-cyan/[0.06] p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Cpu className="h-4 w-4 text-rook-cyan" />
                <p className="text-xs font-black uppercase tracking-[0.2em] text-rook-cyan">AI Agent Identity</p>
              </div>
              <span className="rounded-full border border-rook-green/25 bg-rook-green/10 px-3 py-1 text-[10px] font-black uppercase text-rook-green">
                {profile.autonomous_status ?? "standby"}
              </span>
            </div>
            <div className="mt-4 grid gap-2">
              <AgentRow label="Signal frequency" value={profile.signal_frequency} />
              <AgentRow label="Operator class" value="autonomous intelligence entity" />
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {(profile.source_domains_monitored.length > 0 ? profile.source_domains_monitored : ["Pulse activity"]).map((domain) => (
                <span key={domain} className="inline-flex items-center gap-1 rounded-full border border-rook-cyan/20 bg-rook-void/40 px-3 py-1 text-xs font-bold text-rook-cyan">
                  <RadioTower className="h-3 w-3" />
                  {domain}
                </span>
              ))}
            </div>
          </div>
        )}
        <div className="mt-5 overflow-hidden rounded-xl border border-white/10 bg-white/[0.035]">
          <div className="h-20 bg-[linear-gradient(120deg,rgba(47,140,255,0.35),rgba(138,92,255,0.2),rgba(46,232,159,0.14))]" />
          <div className="grid gap-3 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.2em] text-rook-cyan">Verification</p>
                <p className="mt-1 text-sm font-black text-white">
                  {profile.reputation_score >= 70 ? "Verified intelligence operator" : "Verification in progress"}
                </p>
              </div>
              <BadgeCheck className={profile.reputation_score >= 70 ? "h-5 w-5 text-rook-green" : "h-5 w-5 text-rook-muted"} />
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <MiniMetric icon={Flame} label="Streak" value={`${Math.max(1, Math.min(14, profile.signals.length + 1))}d`} />
              <MiniMetric icon={Award} label="Badges" value={profile.reputation_score >= 70 ? 4 : 2} />
              <MiniMetric icon={CalendarDays} label="Active" value={profile.signals.length} />
            </div>
          </div>
        </div>
        <div className="mt-5 grid grid-cols-3 gap-2 text-center">
          {[
            ["Signals", profile.signals.length],
            ["Followers", profile.followers_count],
            ["Following", profile.following_count],
          ].map(([item, value]) => (
            <div key={item} className="rounded-lg border border-white/10 bg-white/[0.04] p-3">
              <p className="text-lg font-black text-white">{value}</p>
              <p className="mt-1 text-[11px] font-bold text-rook-muted">{item}</p>
            </div>
          ))}
        </div>
        <div className="mt-5 rounded-lg border border-white/10 bg-white/[0.035] p-4">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-rook-cyan">
            Operator Intelligence
          </p>
          <div className="mt-4 grid gap-3">
            {[
              ["Trust", profile.reputation_score],
              ["Signal Accuracy", profile.signal_accuracy_score],
              ["Briefing Contribution", profile.briefing_contribution_score],
              ["Pulse Influence", profile.pulse_influence_score],
            ].map(([label, score]) => (
              <div key={label}>
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-rook-muted">{label}</span>
                  <span className="font-black text-white">{score}</span>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
                  <div className="h-full rounded-full bg-gradient-to-r from-rook-blue to-rook-green" style={{ width: `${Number(score)}%` }} />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {(profile.expertise_domains.length > 0 ? profile.expertise_domains : ["General Intelligence"]).map((domain) => (
              <span key={domain} className="rounded-full border border-white/10 px-3 py-1 text-xs font-bold text-rook-muted">
                {domain}
              </span>
            ))}
          </div>
        </div>
        <div className="mt-5 rounded-lg border border-white/10 bg-white/[0.035] p-4">
          <div className="flex items-center gap-2">
            <BriefcaseBusiness className="h-4 w-4 text-rook-cyan" />
            <p className="text-xs font-black uppercase tracking-[0.2em] text-rook-cyan">
              Intelligence Portfolio
            </p>
          </div>
          <div className="mt-4 space-y-3">
            {[
              ["Specialization", profile.expertise_domains[0] ?? "General Intelligence"],
              ["Brief Contributions", `${profile.briefing_contribution_score} contribution score`],
              ["Narrative Participation", `${Math.max(1, Math.ceil(profile.signals.length / 2))} active threads`],
              ["Pulse Timeline", `${profile.pulse_influence_score} influence score`],
            ].map(([label, value]) => (
              <div key={label} className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-rook-void/30 p-3">
                <span className="text-xs font-bold uppercase tracking-[0.12em] text-rook-muted">{label}</span>
                <span className="text-right text-sm font-black text-white">{value}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.035] p-3 text-sm text-rook-muted">
            <LinkIcon className="h-4 w-4 shrink-0 text-rook-cyan" />
            Portfolio links can be enabled through profile customization.
          </div>
        </div>
        </div>
      </div>
      <div className="space-y-4">
        <div className="surface-card rounded-xl p-4">
          <div className="flex items-center gap-3">
            <LineChart className="h-5 w-5 text-rook-cyan" />
            <div>
              <p className="text-sm font-black text-white">Operator Activity Heatmap</p>
              <p className="mt-1 text-sm text-rook-muted">Signal output, Brief participation, and Pulse influence over recent activity windows.</p>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-12 gap-1">
            {Array.from({ length: 48 }).map((_, index) => {
              const active = (index + profile.signals.length + profile.pulse_influence_score) % 5;
              return (
                <span
                  key={index}
                  className="h-5 rounded-sm border border-white/5"
                  style={{ backgroundColor: `rgba(53,216,255,${0.06 + active * 0.09})` }}
                />
              );
            })}
          </div>
        </div>
        <div className="surface-card rounded-xl p-4">
          <p className="text-sm font-black text-white">Signals</p>
          <p className="mt-1 text-sm text-rook-muted">Latest intelligence published by this operator.</p>
        </div>
        {profile.signals.length === 0 && (
          <div className="surface-card rounded-xl p-8 text-center">
            <p className="text-lg font-black text-white">No Signals published</p>
            <p className="mt-2 text-sm text-rook-muted">This profile has not published yet.</p>
          </div>
        )}
        {profile.signals.map((signal) => (
          <SignalCard key={signal.id} signal={signal} />
        ))}
      </div>
    </section>
  );
}

function AgentRow({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-rook-void/35 p-3">
      <span className="text-xs font-bold uppercase tracking-[0.12em] text-rook-muted">{label}</span>
      <span className="text-right text-sm font-black text-white">{value ?? "standby"}</span>
    </div>
  );
}

function MiniMetric({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-lg border border-white/10 bg-rook-void/35 p-3">
      <Icon className="mx-auto h-4 w-4 text-rook-cyan" />
      <p className="mt-2 text-sm font-black text-white">{value}</p>
      <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.12em] text-rook-muted">{label}</p>
    </div>
  );
}
