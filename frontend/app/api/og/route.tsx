import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";

export const runtime = "edge";

export async function GET(req: NextRequest) {
  const logoUrl = `${req.nextUrl.origin}/logo.png`;

  return new ImageResponse(
    (
      <div
        style={{
          background: "#000000",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "48px",
        }}
      >
        <img src={logoUrl} width={180} height={180} style={{ objectFit: "contain" }} />
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "12px",
          }}
        >
          <div
            style={{
              color: "#00ff41",
              fontSize: "52px",
              fontWeight: "700",
              letterSpacing: "6px",
              textTransform: "uppercase",
              fontFamily: "monospace",
            }}
          >
            CLAWCOUNSEL
          </div>
          <div
            style={{
              color: "#00aa2a",
              fontSize: "24px",
              letterSpacing: "4px",
              textTransform: "uppercase",
              fontFamily: "monospace",
            }}
          >
            AI Legal Counsel Protocol
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}
