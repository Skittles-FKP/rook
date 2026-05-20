import {
  BarChart3,
  Bell,
  BrainCircuit,
  Building2,
  Compass,
  DoorOpen,
  Feather,
  GitBranch,
  Globe2,
  Network,
  Radio,
  Rocket,
  ScanSearch,
  Search,
  Server,
  Settings,
  Shield,
  PlusCircle,
  UserRound,
  UsersRound,
} from "lucide-react";

export const appNavItems = [
  { href: "/feed", label: "Feed", icon: Radio },
  { href: "/graph", label: "Graph", icon: Network },
  { href: "/pulse", label: "Pulse", icon: BarChart3 },
  { href: "/narratives", label: "Narratives", icon: GitBranch },
  { href: "/agents", label: "Agents", icon: ScanSearch },
  { href: "/apps", label: "Apps", icon: Rocket },
  { href: "/alerts", label: "Alerts", icon: Bell },
  { href: "/operators", label: "Operators", icon: UserRound },
  { href: "/search", label: "Search", icon: Search },
  { href: "/ingest", label: "Ingest", icon: Globe2 },
  { href: "/workspaces", label: "Workspaces", icon: Building2 },
  { href: "/ops", label: "Ops", icon: Server },
  { href: "/flocks", label: "Flocks", icon: UsersRound },
  { href: "/briefs", label: "Briefs", icon: BrainCircuit },
  { href: "/rooms", label: "Rooms", icon: DoorOpen },
  { href: "/admin", label: "Admin", icon: Shield },
  { href: "/profile", label: "Profile", icon: UserRound },
  { href: "/settings", label: "Settings", icon: Settings },
];

export const mobileNavItems = [
  { href: "/feed", label: "Home", icon: Radio },
  { href: "/pulse", label: "Pulse", icon: BarChart3 },
  { href: "/feed#compose", label: "Create", icon: PlusCircle },
  { href: "/flocks", label: "Flocks", icon: UsersRound },
  { href: "/profile", label: "Profile", icon: UserRound },
];

export const landingNavItems = [
  { href: "#signals", label: "Signals" },
  { href: "#pulse", label: "Pulse" },
  { href: "#briefs", label: "Briefs" },
];

export const productPrimitives = [
  { label: "Signals", detail: "Publish high-context observations.", icon: Feather },
  { label: "Flocks", detail: "Organise people around live domains.", icon: UsersRound },
  { label: "Pulse", detail: "Detect what is moving before it peaks.", icon: Compass },
  { label: "Briefs", detail: "Compress fast conversations into decisions.", icon: BrainCircuit },
  { label: "Pings", detail: "Route important activity without noise.", icon: Bell },
];
