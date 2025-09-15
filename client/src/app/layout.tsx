import type { Metadata } from "next";
import { DM_Sans, Work_Sans } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "@/components/ui/theme-provider";

// Configure DM Sans for body text and CTAs
const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-dm-sans",
  display: "swap",
});

// Configure Work Sans as better HK Grotesk alternative (more similar geometric style)
const workSans = Work_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-hk-grotesk",
  display: "swap",
});

export const metadata: Metadata = {
  title: "I'm Here Travels",
  description:
    "Connect people with places and create lifelong impact together for the community.",
  icons: {
    icon: [
      {
        url: "/favicon.svg?v=2",
        type: "image/svg+xml",
        sizes: "any",
      },
    ],
    shortcut: "/favicon.svg?v=2",
    apple: "/favicon.svg?v=2",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${dmSans.variable} ${workSans.variable}`}
      suppressHydrationWarning
    >
      <body>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
