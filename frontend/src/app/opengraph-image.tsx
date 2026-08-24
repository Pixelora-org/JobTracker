import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Pipeline: Track the search, not the spreadsheet";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#F5F6F8",
          padding: 72,
          fontFamily: "ui-sans-serif, system-ui, sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            fontSize: 22,
            letterSpacing: 4,
            textTransform: "uppercase",
            color: "#3352E1",
            fontFamily: "ui-monospace, monospace",
          }}
        >
          pipeline
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div
            style={{
              display: "flex",
              fontSize: 64,
              fontWeight: 560,
              color: "#12151C",
              lineHeight: 1.1,
              maxWidth: 900,
            }}
          >
            Track the search, not the spreadsheet.
          </div>
          <div style={{ display: "flex", fontSize: 28, color: "#667085" }}>
            Paste a posting. Log the outreach. Run a daily plan that counts
            itself.
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
