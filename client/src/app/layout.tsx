import type { Metadata } from "next";
import { DM_Sans } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";
import "@/lib/suppress-warnings";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "@/components/ui/theme-provider";
import { SidebarProvider } from "@/contexts/SidebarContext";
import ScrollbarHider from "@/components/ScrollbarHider";

// Configure DM Sans for body text and CTAs
const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-dm-sans",
  display: "swap",
});

// Configure HK Grotesk as heading font
const hkGrotesk = localFont({
  src: [
    {
      path: "../../public/fonts/HKGrotesk/WEB/HKGrotesk-Regular.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "../../public/fonts/HKGrotesk/WEB/HKGrotesk-Medium.woff2",
      weight: "500",
      style: "normal",
    },
    {
      path: "../../public/fonts/HKGrotesk/WEB/HKGrotesk-SemiBold.woff2",
      weight: "600",
      style: "normal",
    },
    {
      path: "../../public/fonts/HKGrotesk/WEB/HKGrotesk-Bold.woff2",
      weight: "700",
      style: "normal",
    },
  ],
  variable: "--font-hk-grotesk",
  display: "swap",
});

export const metadata: Metadata = {
  title: "I'm Here Travels - Admin Dashboard",
  description:
    "Admin dashboard for ImHereTravels booking management. Connect people with places and create lifelong impact together for the community.",
  icons: {
    icon: [
      {
        url: "/logos/Logo_Red.svg",
        type: "image/svg+xml",
        sizes: "any",
      },
    ],
    shortcut: "/logos/Logo_Red.svg",
    apple: "/logos/Logo_Red.svg",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://admin.imheretravels.com",
    siteName: "ImHereTravels Admin",
    title: "Dashboard - ImHereTravels Admin",
    description: "Admin dashboard for ImHereTravels booking management",
  },
  twitter: {
    card: "summary_large_image",
    title: "Dashboard - ImHereTravels Admin",
    description: "Admin dashboard for ImHereTravels booking management",
  },
  metadataBase: new URL("https://admin.imheretravels.com"),
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${dmSans.variable} ${hkGrotesk.variable}`}
      suppressHydrationWarning
    >
      <body>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <ScrollbarHider />
          <SidebarProvider>
            {children}
            <Toaster />
          </SidebarProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
