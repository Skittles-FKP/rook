import { ImageResponse } from "next/og";

export const size = {
  width: 64,
  height: 64,
};

export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "64px",
          height: "64px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#05060a",
          border: "1px solid rgba(255,255,255,0.18)",
          borderRadius: "14px",
        }}
      >
        <svg width="48" height="48" viewBox="0 0 64 64">
          <path
            d="M12 42 28 10l24 8-8 9 9 9-20 18-7-16-14 4Z"
            fill="rgba(53,216,255,0.22)"
            stroke="#35d8ff"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          <path d="M28 10v28l16-11 8-9-24-8Z" fill="rgba(138,92,255,0.42)" />
          <path d="M26 38 12 42l21 12-7-16Z" fill="rgba(47,140,255,0.34)" />
          <path d="M37 20h4" stroke="#f7f9ff" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </div>
    ),
    size,
  );
}
