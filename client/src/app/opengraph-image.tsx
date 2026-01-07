import { ImageResponse } from "next/og";

// Image metadata
export const alt = "ImHereTravels Admin Dashboard";
export const size = {
  width: 1200,
  height: 630,
};

export const contentType = "image/png";

// Image generation
export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          fontSize: 60,
          background: "#1C1F2A",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          color: "white",
          fontFamily: "sans-serif",
          position: "relative",
        }}
      >
        {/* Subtle accent pattern with brand colors */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            opacity: 0.05,
            background: `
              radial-gradient(circle at 20% 30%, #EF3340 0%, transparent 40%),
              radial-gradient(circle at 80% 70%, #FF585D 0%, transparent 40%)
            `,
          }}
        />

        {/* Content */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            textAlign: "center",
            padding: "60px",
            zIndex: 1,
          }}
        >
          {/* Logo placeholder */}
          <div
            style={{
              width: 120,
              height: 120,
              borderRadius: "50%",
              background: "#EF3340",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 40,
              fontSize: 60,
              fontWeight: "bold",
            }}
          >
            ▲
          </div>

          <div
            style={{
              fontSize: 72,
              fontWeight: "bold",
              marginBottom: 20,
              letterSpacing: "-0.02em",
              color: "#FFFFFF",
            }}
          >
            I'm Here Travels
          </div>
          <div
            style={{
              fontSize: 38,
              fontWeight: 500,
              marginBottom: 30,
              color: "#EF3340",
            }}
          >
            Admin Dashboard
          </div>
          <div
            style={{
              fontSize: 26,
              fontWeight: 400,
              opacity: 0.9,
              maxWidth: 800,
              lineHeight: 1.4,
              color: "#F2F0EE",
            }}
          >
            Booking Management & Travel Operations
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            position: "absolute",
            bottom: 40,
            fontSize: 24,
            opacity: 0.7,
            color: "#F2F0EE",
          }}
        >
          admin.imheretravels.com
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
