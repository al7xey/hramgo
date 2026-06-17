import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "HramGo - temples of Moscow";
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
        <div style={{ fontSize: 76, lineHeight: 1.06, fontWeight: 900, maxWidth: 920 }}>{"\u0425\u0440\u0430\u043c\u044b \u041c\u043e\u0441\u043a\u0432\u044b \u0440\u044f\u0434\u043e\u043c"}</div>
        <div style={{ marginTop: 28, fontSize: 34, lineHeight: 1.35, color: "#49657d", maxWidth: 980 }}>{"\u0410\u0434\u0440\u0435\u0441\u0430, \u043a\u0430\u0440\u0442\u0430, \u043c\u0435\u0442\u0440\u043e, \u0444\u043e\u0442\u043e, \u0440\u0430\u0441\u043f\u0438\u0441\u0430\u043d\u0438\u044f \u0438 \u043a\u043e\u043d\u0442\u0430\u043a\u0442\u044b \u043f\u0440\u0430\u0432\u043e\u0441\u043b\u0430\u0432\u043d\u044b\u0445 \u0445\u0440\u0430\u043c\u043e\u0432."}</div>
      </div>
      <div style={{ fontSize: 28, color: "#2096e8", fontWeight: 700 }}>hramgo.ru</div>
    </div>,
    size
  );
}
