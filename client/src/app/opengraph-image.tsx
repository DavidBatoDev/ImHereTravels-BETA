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
          {/* Logo */}
          <div
            style={{
              marginBottom: 40,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 360" width="120" height="120">
              <path fill="#EF3340" d="M280.31,200.62h-61.44c-10.08,0-18.25,8.17-18.25,18.25v61.44c0,20.85,8,40.57,22.54,55.54,15.37,15.82,35.8,24.05,57.13,24.05,12.81,0,25.95-2.97,38.52-9.05,13.93-6.74,25.31-18.12,32.05-32.05,16.2-33.5,10.31-71.05-15.01-95.65-14.97-14.53-34.69-22.53-55.54-22.53ZM333.8,310.56c-4.89,10.1-13.14,18.36-23.24,23.24-31.59,15.28-58.84,4.26-73.81-11.15-11.08-11.41-17.18-26.45-17.18-42.34v-56.42c0-2.38,1.93-4.32,4.32-4.32h56.43c15.89,0,30.93,6.1,42.34,17.18,15.41,14.97,26.43,42.23,11.15,73.81Z"/>
              <path fill="#EF3340" d="M79.06,158.12h60.89c10.02,0,18.17-8.15,18.17-18.17v-60.89c0-20.68-7.94-40.25-22.36-55.1C111.35-1.16,74.11-7,40.87,9.07c-13.82,6.68-25.12,17.98-31.8,31.8C-7,74.11-1.16,111.35,23.96,135.77c14.85,14.41,34.42,22.35,55.09,22.35Z"/>
              <path fill="#EF3340" d="M270.28,179.44c49.47,0,89.72-40.25,89.72-89.72S319.75,0,270.28,0s-89.72,40.25-89.72,89.72v30.09c0,33.49-27.25,60.74-60.74,60.74h-30.09C40.25,180.56,0,220.81,0,270.28s40.25,89.72,89.72,89.72,89.72-40.25,89.72-89.72v-30.09c0-33.49,27.25-60.74,60.74-60.74h30.09ZM160.5,240.19v30.09c0,39.03-31.75,70.78-70.77,70.78s-70.77-31.75-70.77-70.78,31.75-70.77,70.77-70.77h30.09c43.94,0,79.69-35.75,79.69-79.69v-30.09c0-39.03,31.75-70.78,70.77-70.78s70.77,31.75,70.77,70.78-31.75,70.77-70.77,70.77h-30.09c-43.94,0-79.69,35.75-79.69,79.69Z"/>
            </svg>
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
