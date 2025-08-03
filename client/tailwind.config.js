/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",

    // Or if using `src` directory:
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      fontFamily: {
        // Brand typography using CSS variables from Next.js fonts
        "hk-grotesk": ["var(--font-hk-grotesk)", "system-ui", "sans-serif"],
        "dm-sans": ["var(--font-dm-sans)", "system-ui", "sans-serif"],
        // Set DM Sans as primary brand font for body text
        sans: ["var(--font-dm-sans)", "system-ui", "sans-serif"],
      },
      fontSize: {
        // Typography hierarchy from brand guidelines
        heading: ["96px", { lineHeight: "120%", letterSpacing: "-2%" }],
        subhead: ["48px", { lineHeight: "120%", letterSpacing: "-2%" }],
        standfirst: ["24px", { lineHeight: "140%", letterSpacing: "0%" }],
        body: ["16px", { lineHeight: "150%", letterSpacing: "0%" }],
        "cta-url": ["16px", { lineHeight: "100%", letterSpacing: "0%" }],
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",

        /* Primary Brand Colors */
        "crimson-red": "#EF3340" /* Pantone 032 C */,
        "light-red": "#FF585D",
        white: "#FFFFFF",
        "creative-midnight": "#1C1F2A" /* Pantone 532 C */,
        black: "#000000",
        grey: "#959595",
        "light-grey": "#F2F0EE",

        /* Secondary Brand Colors */
        "royal-purple": "#685BC7" /* Pantone PMS 2725 C */,
        "vivid-orange": "#FF8200" /* Pantone 151 C */,
        "light-orange": "#FFB25B",
        "light-purple": "#B397F7",
        "spring-green": "#26D07C" /* Pantone 7479 C */,
        "light-green": "#E1E66B",
        "sunglow-yellow": "#FED141" /* Pantone 122 C */,
        "light-yellow": "#FBE687",

        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: {
            height: "0",
          },
          to: {
            height: "var(--radix-accordion-content-height)",
          },
        },
        "accordion-up": {
          from: {
            height: "var(--radix-accordion-content-height)",
          },
          to: {
            height: "0",
          },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
