import { ImageResponse } from "next/og";
import { site } from "@/config/site";

export const runtime = "edge";

function clean(value, fallback) {
  return String(value || fallback || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 180);
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const title = clean(searchParams.get("title"), site.name);
  const category = clean(searchParams.get("category"), "مقال");

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "linear-gradient(135deg,#ffffff 0%,#fff7ed 42%,#fee2e2 100%)",
          color: "#020617",
          padding: "64px",
          direction: "rtl",
          fontFamily: "Arial, sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
            <div
              style={{
                width: 78,
                height: 78,
                borderRadius: 26,
                background: "#fff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 20px 60px rgba(127,29,29,.18)",
                color: "#b91c1c",
                fontSize: 46,
                fontWeight: 900,
              }}
            >
              و
            </div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ fontSize: 30, fontWeight: 900, letterSpacing: 7, color: "#7f1d1d" }}>WIKIHIS</div>
              <div style={{ marginTop: 6, fontSize: 24, color: "#334155" }}>{site.name}</div>
            </div>
          </div>
          <div
            style={{
              border: "2px solid rgba(185,28,28,.2)",
              borderRadius: 999,
              padding: "16px 28px",
              fontSize: 26,
              fontWeight: 800,
              color: "#991b1b",
              background: "rgba(255,255,255,.72)",
            }}
          >
            {category}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
          <div
            style={{
              width: 120,
              height: 8,
              borderRadius: 999,
              background: "linear-gradient(90deg,#ef4444,#7f1d1d)",
            }}
          />
          <h1
            style={{
              margin: 0,
              fontSize: title.length > 70 ? 54 : 68,
              lineHeight: 1.35,
              fontWeight: 950,
              letterSpacing: "-1px",
              maxWidth: 980,
            }}
          >
            {title}
          </h1>
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", color: "#475569" }}>
          <div style={{ fontSize: 26, fontWeight: 700 }}>{site.description}</div>
          <div style={{ fontSize: 28, fontWeight: 900, color: "#7f1d1d" }}>wikihis.vercel.app</div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
