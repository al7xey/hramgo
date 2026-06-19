import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "HramGo — поиск храмов Москвы";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

function PinMark() {
  return (
    <div style={{ width: 104, height: 104, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div
        style={{
          width: 78,
          height: 78,
          borderRadius: "50% 50% 50% 16px",
          background: "#dff1ff",
          border: "6px solid #2096e8",
          transform: "rotate(-45deg)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center"
        }}
      >
        <div style={{ width: 24, height: 24, borderRadius: 999, background: "#2096e8" }} />
      </div>
    </div>
  );
}

export default function Image() {
  return new ImageResponse(
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", background: "linear-gradient(135deg,#f8fbff 0%,#eaf6ff 55%,#ffffff 100%)", color: "#0f172a", padding: 72, fontFamily: "Arial" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
        <PinMark />
        <div style={{ fontSize: 54, fontWeight: 800 }}>HramGo</div>
      </div>
      <div style={{ display: "flex", flexDirection: "column" }}>
        <div style={{ fontSize: 76, lineHeight: 1.06, fontWeight: 900, maxWidth: 920 }}>Поиск храмов Москвы</div>
        <div style={{ marginTop: 28, fontSize: 34, lineHeight: 1.35, color: "#49657d", maxWidth: 980 }}>Адреса, расписания, метро, МЦД, контакты, фото и карта православных храмов.</div>
      </div>
      <div style={{ fontSize: 28, color: "#2096e8", fontWeight: 700 }}>hramgo.ru</div>
    </div>,
    size
  );
}
