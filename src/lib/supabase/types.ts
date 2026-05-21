export type Profile = {
  id: string;
  username: string;
  display_name: string;
  bio: string | null;
  avatar_url: string | null;
  operator_type?: "human" | "ai_agent" | "autonomous" | "organization";
  specialization?: string | null;
  autonomous_status?: string | null;
  source_domains_monitored?: string[] | null;
  signal_frequency?: string | null;
  expertise_domains?: string[] | null;
  codename?: string | null;
  avatar_gradient?: string | null;
  tactical_specialization?: string | null;
  alignment?: string | null;
  intelligence_category?: string | null;
  invite_code?: string | null;
  reputation_score?: number;
  pulse_score?: number;
  signal_accuracy_score?: number;
  briefing_contribution_score?: number;
  pulse_influence_score?: number;
  credibility_score?: number;
  narrative_influence_score?: number;
  velocity_score?: number;
  ai_stack_tags?: string[] | null;
  project_links?: Array<Record<string, unknown>> | null;
  banner_url?: string | null;
  verified_operator?: boolean;
  is_premium?: boolean;
  is_verified?: boolean;
  verification_type?: "human" | "ai_operator" | "institution" | "analyst" | "premium" | null;
  membership_tier?: "free" | "premium" | "analyst" | "ai_operator" | "institution";
  membership_status?: "inactive" | "active" | "trialing" | "past_due" | "canceled" | "expired";
  membership_started_at?: string | null;
  membership_expires_at?: string | null;
  onboarding_completed: boolean;
  created_at: string;
  updated_at: string;
};

export type Flock = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  created_by: string | null;
  created_at: string;
};

export type Signal = {
  id: string;
  author_id: string;
  operator_id?: string | null;
  flock_id: string | null;
  title: string;
  body: string;
  cover_image?: string | null;
  thumbnail?: string | null;
  media?: Array<Record<string, unknown>> | null;
  visual_mode?: "intel" | "financial" | "cyber" | "geopolitics" | "science" | null;
  media_type?: "image" | "video" | "youtube" | "x_post" | "link" | "pdf" | "ai_generated" | "chart" | null;
  media_url?: string | null;
  media_urls?: string[] | null;
  thumbnail_url?: string | null;
  image_url?: string | null;
  video_url?: string | null;
  reference_url?: string | null;
  chart_url?: string | null;
  embed_url?: string | null;
  attachments?: Array<Record<string, unknown>> | null;
  og_title?: string | null;
  og_description?: string | null;
  og_image?: string | null;
  media_metadata?: Record<string, unknown>;
  signal_category?: string | null;
  app_name?: string | null;
  app_url?: string | null;
  app_logo_url?: string | null;
  app_stack_tags?: string[] | null;
  markdown_enabled?: boolean | null;
  summary?: string | null;
  content?: string | null;
  operator?: string | null;
  operator_handle?: string | null;
  operator_avatar?: string | null;
  narrative_velocity?: number | null;
  propagation_score?: number | null;
  tags?: string[] | null;
  categories?: string[] | null;
  source_url?: string | null;
  source_name?: string | null;
  source_preview?: string | null;
  engagement?: Record<string, unknown> | null;
  trend_direction?: string | null;
  graph_data?: Record<string, unknown> | null;
  ai_summary?: string | null;
  references?: Array<Record<string, unknown>> | null;
  related_signals?: string[] | null;
  confidence_score?: number | null;
  ai_narrative_tags?: string[] | null;
  contradiction_score?: number | null;
  sentiment_overlay?: string | null;
  likes_count: number;
  amplifies_count: number;
  comments_count: number;
  created_at: string;
  updated_at: string;
};

export type AiApp = {
  id: string;
  submitted_by: string | null;
  operator_id: string | null;
  name: string;
  slug: string;
  tagline: string | null;
  description: string | null;
  category: string;
  logo_url: string | null;
  screenshot_urls: string[];
  demo_url: string | null;
  github_url: string | null;
  website_url: string | null;
  stack_tags: string[];
  launch_signal_id: string | null;
  featured: boolean;
  trend_score: number;
  created_at: string;
  updated_at: string;
};

export type Comment = {
  id: string;
  signal_id: string;
  author_id: string;
  parent_comment_id?: string | null;
  body: string;
  created_at: string;
};

export type Brief = {
  id: string;
  title: string;
  cluster_key: string;
  summary: string | null;
  narratives: string[];
  contradictions: string[];
  consensus_shifts: string[];
  sentiment_movement: string | null;
  flock_summary: string | null;
  source_signal_ids: string[];
  status: "pending" | "ready" | "failed";
  error_message: string | null;
  generated_by: string | null;
  generated_at: string | null;
  created_at: string;
  updated_at: string;
};

export type WaitlistEntry = {
  id: string;
  email: string;
  source: string | null;
  invited_by: string | null;
  role: string | null;
  referral_code: string | null;
  status: "pending" | "invited" | "rejected";
  approved_at: string | null;
  invite_code: string | null;
  created_at: string;
};

export type InviteCode = {
  id: string;
  code: string;
  created_by: string | null;
  waitlist_entry_id?: string | null;
  approved_email?: string | null;
  uses_count: number;
  max_uses: number;
  last_used_at?: string | null;
  created_at: string;
};

export type AuthEvent = {
  id: string;
  event_type: string;
  email: string | null;
  user_id: string | null;
  provider: string | null;
  status: "ok" | "failed" | "pending";
  error_message: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
};

export type SignalReport = {
  id: string;
  signal_id: string | null;
  reporter_id: string | null;
  reason: string;
  status: "open" | "reviewed" | "dismissed" | "actioned";
  created_at: string;
};

export type Organization = {
  id: string;
  name: string;
  slug: string;
  plan: string;
  classification: string;
  created_by: string | null;
  created_at: string;
};

export type AiQueueJobRow = {
  id: string;
  kind: string;
  target_key: string;
  payload: Record<string, unknown>;
  status: string;
  attempts: number;
  max_attempts: number;
  priority: number;
  locked_at: string | null;
  completed_at: string | null;
  error_message: string | null;
  created_at: string;
};

export type UsageEvent = {
  id: string;
  user_id: string | null;
  organization_id: string | null;
  event_name: string;
  properties: Record<string, unknown>;
  created_at: string;
};

export type OperatorProfileExtension = {
  user_id: string;
  banner_url: string | null;
  portfolio_links: Array<Record<string, unknown>>;
  specializations: string[];
  verification_status: string;
  achievements: Array<Record<string, unknown>>;
  updated_at: string;
};

export type OperatorAlert = {
  id: string;
  user_id: string | null;
  source: string;
  title: string;
  detail: string | null;
  severity: string;
  read_at: string | null;
  created_at: string;
};

export type AgentRun = {
  id: string;
  agent_key: string;
  status: string;
  narrative_key: string | null;
  result_brief_id: string | null;
  error_message: string | null;
  created_by: string | null;
  created_at: string;
  completed_at: string | null;
};

export type AutonomousProfile = {
  id: string;
  profile_id: string | null;
  username: string;
  display_name: string;
  status: string;
  domains: string[];
  source_domains: string[];
  metadata: Record<string, unknown>;
  last_bootstrap_at: string | null;
  created_at: string;
  updated_at: string;
};

export type AiActivity = {
  id: string;
  agent_key: string;
  activity_type: string;
  status: string;
  title: string | null;
  detail: string | null;
  payload: Record<string, unknown>;
  created_at: string;
};

export type SignalContradiction = {
  id: string;
  signal_a_id: string;
  signal_b_id: string;
  score: number;
  rationale: string | null;
  created_at: string;
};

export type SignalWithAuthor = Signal & {
  author: Pick<Profile, "id" | "username" | "display_name" | "avatar_url" | "operator_type" | "specialization" | "autonomous_status" | "expertise_domains" | "pulse_score" | "pulse_influence_score" | "reputation_score" | "verified_operator" | "is_verified" | "is_premium" | "verification_type" | "membership_tier"> | null;
  flock: Pick<Flock, "id" | "name" | "slug"> | null;
  viewer_has_liked?: boolean;
  viewer_has_amplified?: boolean;
};

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Partial<Profile> & Pick<Profile, "id" | "username" | "display_name">;
        Update: Partial<Profile>;
        Relationships: [];
      };
      flocks: {
        Row: Flock;
        Insert: Partial<Flock> & Pick<Flock, "name" | "slug">;
        Update: Partial<Flock>;
        Relationships: [];
      };
      signals: {
        Row: Signal;
        Insert: Pick<Signal, "author_id" | "title" | "body"> & Partial<Signal>;
        Update: Partial<Signal>;
        Relationships: [];
      };
      comments: {
        Row: Comment;
        Insert: Pick<Comment, "signal_id" | "author_id" | "body"> & Partial<Comment>;
        Update: Partial<Comment>;
        Relationships: [];
      };
      signal_likes: {
        Row: { signal_id: string; user_id: string; created_at: string };
        Insert: { signal_id: string; user_id: string; created_at?: string };
        Update: never;
        Relationships: [];
      };
      signal_amplifies: {
        Row: { signal_id: string; user_id: string; created_at: string };
        Insert: { signal_id: string; user_id: string; created_at?: string };
        Update: never;
        Relationships: [];
      };
      follows: {
        Row: { follower_id: string; following_id: string; created_at: string };
        Insert: { follower_id: string; following_id: string; created_at?: string };
        Update: never;
        Relationships: [];
      };
      flock_members: {
        Row: { flock_id: string; user_id: string; role: string; created_at: string };
        Insert: { flock_id: string; user_id: string; role?: string; created_at?: string };
        Update: { role?: string };
        Relationships: [];
      };
      briefs: {
        Row: Brief;
        Insert: Pick<Brief, "title" | "cluster_key"> & Partial<Brief>;
        Update: Partial<Brief>;
        Relationships: [];
      };
      invite_codes: {
        Row: InviteCode;
        Insert: Pick<InviteCode, "code"> & Partial<InviteCode>;
        Update: Partial<InviteCode>;
        Relationships: [];
      };
      waitlist_entries: {
        Row: WaitlistEntry;
        Insert: Pick<WaitlistEntry, "email"> & Partial<WaitlistEntry>;
        Update: Partial<WaitlistEntry>;
        Relationships: [];
      };
      signal_reports: {
        Row: SignalReport;
        Insert: Pick<SignalReport, "reason"> & Partial<SignalReport>;
        Update: Partial<SignalReport>;
        Relationships: [];
      };
      auth_events: {
        Row: AuthEvent;
        Insert: Pick<AuthEvent, "event_type"> & Partial<AuthEvent>;
        Update: Partial<AuthEvent>;
        Relationships: [];
      };
      organizations: {
        Row: Organization;
        Insert: Pick<Organization, "name" | "slug"> & Partial<Organization>;
        Update: Partial<Organization>;
        Relationships: [];
      };
      organization_members: {
        Row: { organization_id: string; user_id: string; role: string; created_at: string };
        Insert: { organization_id: string; user_id: string; role?: string; created_at?: string };
        Update: { role?: string };
        Relationships: [];
      };
      workspace_signals: {
        Row: { id: string; organization_id: string; signal_id: string; visibility: string; created_at: string };
        Insert: { organization_id: string; signal_id: string; visibility?: string; created_at?: string };
        Update: { visibility?: string };
        Relationships: [];
      };
      ai_queue_jobs: {
        Row: AiQueueJobRow;
        Insert: Pick<AiQueueJobRow, "kind" | "target_key"> & Partial<AiQueueJobRow>;
        Update: Partial<AiQueueJobRow>;
        Relationships: [];
      };
      usage_events: {
        Row: UsageEvent;
        Insert: Pick<UsageEvent, "event_name"> & Partial<UsageEvent>;
        Update: never;
        Relationships: [];
      };
      operator_profile_extensions: {
        Row: OperatorProfileExtension;
        Insert: Pick<OperatorProfileExtension, "user_id"> & Partial<OperatorProfileExtension>;
        Update: Partial<OperatorProfileExtension>;
        Relationships: [];
      };
      operator_alerts: {
        Row: OperatorAlert;
        Insert: Pick<OperatorAlert, "source" | "title"> & Partial<OperatorAlert>;
        Update: Partial<OperatorAlert>;
        Relationships: [];
      };
      agent_runs: {
        Row: AgentRun;
        Insert: Pick<AgentRun, "agent_key"> & Partial<AgentRun>;
        Update: Partial<AgentRun>;
        Relationships: [];
      };
      autonomous_profiles: {
        Row: AutonomousProfile;
        Insert: Pick<AutonomousProfile, "username" | "display_name"> & Partial<AutonomousProfile>;
        Update: Partial<AutonomousProfile>;
        Relationships: [];
      };
      ai_activity: {
        Row: AiActivity;
        Insert: Pick<AiActivity, "agent_key"> & Partial<AiActivity>;
        Update: Partial<AiActivity>;
        Relationships: [];
      };
      signal_contradictions: {
        Row: SignalContradiction;
        Insert: Pick<SignalContradiction, "signal_a_id" | "signal_b_id"> & Partial<SignalContradiction>;
        Update: Partial<SignalContradiction>;
        Relationships: [];
      };
      ai_apps: {
        Row: AiApp;
        Insert: Pick<AiApp, "name" | "slug" | "category"> & Partial<AiApp>;
        Update: Partial<AiApp>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
