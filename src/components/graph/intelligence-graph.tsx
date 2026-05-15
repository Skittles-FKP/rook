"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ExternalLink, Maximize2, Minus, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { GraphEdge, GraphNode } from "@/lib/intelligence";

type PositionedNode = GraphNode & {
  x: number;
  y: number;
};

const nodeColors: Record<GraphNode["kind"], string> = {
  signal: "#35d8ff",
  operator: "#f7f9ff",
  flock: "#8a5cff",
  topic: "#2ee89f",
  brief: "#ffbf47",
  cluster: "#2f8cff",
};

export function IntelligenceGraph({
  nodes,
  edges,
}: {
  nodes: GraphNode[];
  edges: GraphEdge[];
}) {
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [liveEvents, setLiveEvents] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(nodes[0]?.id ?? null);
  const drag = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("rook-intelligence-graph")
      .on("postgres_changes", { event: "*", schema: "public", table: "signals" }, () => {
        console.info("[realtime:graph] signals propagation received");
        setLiveEvents((value) => value + 1);
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "signal_amplifies" }, () => {
        console.info("[realtime:graph] signal_amplifies propagation received");
        setLiveEvents((value) => value + 1);
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "briefs" }, () => {
        console.info("[realtime:graph] briefs propagation received");
        setLiveEvents((value) => value + 1);
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "profiles" }, () => {
        console.info("[realtime:graph] profiles propagation received");
        setLiveEvents((value) => value + 1);
      })
      .subscribe((status, error) => {
        console.info("[realtime:graph] subscription state", { status, error });
      });

    return () => {
      void supabase.removeChannel(channel);
    };
  }, []);

  const positioned = useMemo(() => layoutNodes(nodes), [nodes]);
  const positionedById = useMemo(() => new Map(positioned.map((node) => [node.id, node])), [positioned]);
  const selectedNode = selectedId ? positionedById.get(selectedId) : null;
  const selectedHref = selectedNode ? getNodeHref(selectedNode) : null;

  return (
    <div className="surface-card relative min-h-[520px] overflow-hidden rounded-xl sm:min-h-[620px]">
      <div className="absolute inset-x-0 top-0 z-10 flex flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-rook-void/70 px-3 py-3 backdrop-blur-xl sm:px-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.2em] text-rook-cyan">
            Intelligence Graph
          </p>
          <p className="mt-1 text-xs text-rook-muted">
            {nodes.length} nodes · {edges.length} links · live {liveEvents}
          </p>
        </div>
        <div className="flex items-center gap-1.5 sm:gap-2">
          {selectedNode && (
            <div className="hidden max-w-[220px] truncate rounded-lg border border-white/10 bg-white/[0.05] px-3 py-2 text-xs font-bold text-white sm:block">
              {selectedNode.label}
            </div>
          )}
          <GraphButton label="Zoom out" onClick={() => setScale((value) => Math.max(0.55, value - 0.12))}>
            <Minus className="h-4 w-4" />
          </GraphButton>
          <GraphButton label="Reset graph" onClick={() => {
            setScale(1);
            setOffset({ x: 0, y: 0 });
          }}>
            <Maximize2 className="h-4 w-4" />
          </GraphButton>
          <GraphButton label="Zoom in" onClick={() => setScale((value) => Math.min(1.8, value + 0.12))}>
            <Plus className="h-4 w-4" />
          </GraphButton>
        </div>
      </div>

      <svg
        viewBox="0 0 1100 640"
        className="h-[520px] w-full cursor-grab touch-none select-none pt-20 active:cursor-grabbing sm:h-[620px] sm:pt-14"
        onWheel={(event) => {
          event.preventDefault();
          setScale((value) => Math.min(1.8, Math.max(0.55, value + (event.deltaY > 0 ? -0.08 : 0.08))));
        }}
        onPointerDown={(event) => {
          drag.current = { x: event.clientX - offset.x, y: event.clientY - offset.y };
        }}
        onPointerMove={(event) => {
          if (!drag.current) return;
          setOffset({ x: event.clientX - drag.current.x, y: event.clientY - drag.current.y });
        }}
        onPointerUp={() => {
          drag.current = null;
        }}
        onPointerLeave={() => {
          drag.current = null;
        }}
      >
        <defs>
          <radialGradient id="graph-node-glow">
            <stop offset="0%" stopColor="rgba(53,216,255,0.34)" />
            <stop offset="100%" stopColor="rgba(53,216,255,0)" />
          </radialGradient>
          {positioned
            .filter((node) => node.kind === "operator" && node.avatarUrl)
            .map((node) => (
              <clipPath key={node.id} id={graphNodeClipId(node.id)} clipPathUnits="userSpaceOnUse">
                <circle r={Math.max(5, node.weight - 2)} />
              </clipPath>
            ))}
        </defs>
        <rect width="1100" height="640" fill="rgba(5,6,10,0.72)" />
        {liveEvents > 0 && (
          <circle cx="550" cy="330" r={120 + Math.min(180, liveEvents * 14)} fill="none" stroke="rgba(53,216,255,0.28)" strokeWidth="2" className="graph-ripple" />
        )}
        <g opacity="0.18">
          {Array.from({ length: 22 }).map((_, index) => (
            <line key={`v-${index}`} x1={index * 52} y1="0" x2={index * 52} y2="640" stroke="white" />
          ))}
          {Array.from({ length: 14 }).map((_, index) => (
            <line key={`h-${index}`} x1="0" y1={index * 52} x2="1100" y2={index * 52} stroke="white" />
          ))}
        </g>
        <g transform={`translate(${offset.x} ${offset.y}) scale(${scale})`}>
          {edges.map((edge) => {
            const source = positionedById.get(edge.source);
            const target = positionedById.get(edge.target);
            if (!source || !target) return null;
            return (
              <line
                key={edge.id}
                className={edge.kind === "contradicts" || edge.kind === "converges" ? "graph-relation-active" : undefined}
                x1={source.x}
                y1={source.y}
                x2={target.x}
                y2={target.y}
                stroke={
                  edge.kind === "contradicts"
                    ? "#ffbf47"
                    : edge.kind === "converges"
                      ? "#35d8ff"
                      : "rgba(247,249,255,0.25)"
                }
                strokeWidth={Math.min(4, edge.strength)}
                strokeDasharray={edge.kind === "contradicts" ? "4 6" : edge.kind === "alignment" ? "7 7" : undefined}
              />
            );
          })}
          {positioned.map((node) => (
            <g
              key={node.id}
              transform={`translate(${node.x} ${node.y})`}
              className="graph-node cursor-pointer"
              onClick={(event) => {
                event.stopPropagation();
                setSelectedId(node.id);
              }}
            >
              <circle r={node.weight + 16} fill="url(#graph-node-glow)" opacity={selectedId === node.id ? 0.95 : node.kind === "cluster" ? 0.8 : 0.35} />
              {(node.kind === "cluster" || node.pulse > 60) && (
                <circle r={node.weight + 23} fill="none" stroke={nodeColors[node.kind]} strokeWidth="1.2" opacity="0.45" className="graph-node-halo" />
              )}
              <circle
                r={node.weight}
                fill="rgba(8,10,18,0.94)"
                stroke={nodeColors[node.kind]}
                strokeWidth={selectedId === node.id ? 3 : node.kind === "cluster" ? 2.4 : 1.5}
              />
              {node.kind === "operator" && node.avatarUrl ? (
                <image
                  href={node.avatarUrl}
                  x={-Math.max(5, node.weight - 2)}
                  y={-Math.max(5, node.weight - 2)}
                  width={Math.max(10, (node.weight - 2) * 2)}
                  height={Math.max(10, (node.weight - 2) * 2)}
                  preserveAspectRatio="xMidYMid slice"
                  clipPath={`url(#${graphNodeClipId(node.id)})`}
                />
              ) : (
                <circle r={Math.max(3, Math.min(8, node.pulse / 12))} fill={nodeColors[node.kind]} opacity="0.9" />
              )}
              {node.kind === "operator" && node.avatarUrl && (
                <circle r={Math.max(3, Math.min(6, node.pulse / 14))} fill={nodeColors[node.kind]} opacity="0.95" />
              )}
              <text x={node.weight + 9} y="-2" fill="#f7f9ff" fontSize="12" fontWeight="800">
                {node.label.length > 28 ? `${node.label.slice(0, 28)}...` : node.label}
              </text>
              <text x={node.weight + 9} y="14" fill="#8f9bb3" fontSize="10" fontWeight="700">
                {node.meta}
              </text>
            </g>
          ))}
        </g>
      </svg>
      {selectedNode && (
        <div className="absolute inset-x-3 bottom-3 rounded-lg border border-white/10 bg-rook-void/85 p-3 backdrop-blur-xl sm:inset-x-auto sm:right-4 sm:w-80">
          <div className="flex items-center justify-between gap-3">
            <p className="truncate text-sm font-black text-white">{selectedNode.label}</p>
            <span className="rounded-full border border-rook-cyan/20 bg-rook-cyan/10 px-2 py-1 text-[10px] font-black uppercase text-rook-cyan">
              {selectedNode.kind}
            </span>
          </div>
          <p className="mt-2 text-xs leading-5 text-rook-muted">{selectedNode.meta}</p>
          <div className="mt-3 grid grid-cols-2 gap-2 text-center">
            <div className="rounded-md bg-white/[0.04] p-2">
              <p className="text-sm font-black text-white">{Math.round(selectedNode.pulse)}</p>
              <p className="text-[10px] font-bold uppercase text-rook-muted">Pulse</p>
            </div>
            <div className="rounded-md bg-white/[0.04] p-2">
              <p className="text-sm font-black text-white">{Math.round(selectedNode.weight)}</p>
              <p className="text-[10px] font-bold uppercase text-rook-muted">Weight</p>
            </div>
          </div>
          {selectedHref && (
            <a
              href={selectedHref}
              className="focus-ring mt-3 flex items-center justify-center gap-2 rounded-lg border border-rook-cyan/25 bg-rook-cyan/10 px-3 py-2 text-xs font-black uppercase tracking-[0.12em] text-rook-cyan transition hover:border-rook-cyan/50 hover:text-white"
            >
              Open related view
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}
          <div className="mt-3 rounded-md border border-white/10 bg-white/[0.035] p-2">
            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-rook-muted">Influence Overlay</p>
            <p className="mt-1 text-xs leading-5 text-rook-muted">
              {selectedNode.kind === "operator"
                ? "Operator relationships are derived from authored Signals, Flock overlap, and Pulse adjacency."
                : "Related narratives are inferred from Pulse clusters, tags, Flocks, and Brief links."}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function getNodeHref(node: GraphNode) {
  const separator = node.id.indexOf(":");
  const rawId = separator >= 0 ? node.id.slice(separator + 1) : "";
  if (!rawId) return null;

  if (node.kind === "operator") return `/profile/${rawId}`;
  if (node.kind === "signal") return `/signals/${rawId}`;
  if (node.kind === "flock") return `/flocks/${rawId}`;
  if (node.kind === "brief") return `/briefs`;
  if (node.kind === "topic" || node.kind === "cluster") return `/graph?focus=${encodeURIComponent(rawId)}`;
  return null;
}

function graphNodeClipId(id: string) {
  return `graph-avatar-${id.replace(/[^a-zA-Z0-9_-]/g, "-")}`;
}

function GraphButton({
  label,
  children,
  onClick,
}: {
  label: string;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className="focus-ring grid h-9 w-9 place-items-center rounded-lg border border-white/10 bg-white/[0.05] text-rook-muted transition hover:text-white"
    >
      {children}
    </button>
  );
}

function layoutNodes(nodes: GraphNode[]): PositionedNode[] {
  const centerX = 550;
  const centerY = 330;
  const byKind = new Map<GraphNode["kind"], GraphNode[]>();

  for (const node of nodes) {
    byKind.set(node.kind, [...(byKind.get(node.kind) ?? []), node]);
  }

  const ringConfig: Array<[GraphNode["kind"], number]> = [
    ["cluster", 80],
    ["topic", 150],
    ["signal", 240],
    ["operator", 320],
    ["flock", 385],
    ["brief", 455],
  ];

  return ringConfig.flatMap(([kind, radius], ringIndex) => {
    const ringNodes = byKind.get(kind) ?? [];
    return ringNodes.map((node, index) => {
      const angle = (Math.PI * 2 * index) / Math.max(ringNodes.length, 1) + ringIndex * 0.42;
      return {
        ...node,
        x: centerX + Math.cos(angle) * radius,
        y: centerY + Math.sin(angle) * radius * 0.62,
      };
    });
  });
}
