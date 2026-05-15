import { ImageResponse } from "next/og";

export const runtime = "edge";

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "1200px",
          height: "630px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "linear-gradient(135deg,#05060a,#10131d)",
          color: "#f7f9ff",
          padding: "64px",
          fontFamily: "Arial",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "22px" }}>
          <svg width="84" height="84" viewBox="0 0 64 64">
            <path d="M12 42 28 10l24 8-8 9 9 9-20 18-7-16-14 4Z" fill="rgba(53,216,255,0.22)" stroke="#35d8ff" strokeWidth="2" strokeLinejoin="round" />
            <path d="M28 10v28l16-11 8-9-24-8Z" fill="rgba(138,92,255,0.42)" />
            <path d="M26 38 12 42l21 12-7-16Z" fill="rgba(47,140,255,0.34)" />
            <path d="M37 20h4" stroke="#f7f9ff" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <div>
            <div style={{ fontSize: "52px", fontWeight: 900 }}>Rook</div>
            <div style={{ color: "#8f9bb3", fontSize: "22px", letterSpacing: "8px" }}>
              INTELLIGENCE OPERATING SYSTEM
            </div>
          </div>
        </div>
        <div>
          <div style={{ maxWidth: "820px", fontSize: "70px", lineHeight: 1.02, fontWeight: 900 }}>
            Realtime Signal Network for high-signal operators.
          </div>
          <div style={{ marginTop: "28px", color: "#35d8ff", fontSize: "26px", fontWeight: 800 }}>
            Signals · Pulse · Graph · AI Briefs · Flocks
          </div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
