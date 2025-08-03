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
      padding: '2rem',
      screens: {
        '2xl': '1400px'
      }
    },
    extend: {
      fontFamily: {
        // Brand typography using CSS variables from Next.js fonts
        'hk-grotesk': ['var(--font-hk-grotesk)', 'system-ui', 'sans-serif'],
        'dm-sans': ['var(--font-dm-sans)', 'system-ui', 'sans-serif'],
        // Set DM Sans as primary brand font for body text
        sans: ['var(--font-dm-sans)', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        // Typography hierarchy from brand guidelines
        'heading': ['96px', { lineHeight: '120%', letterSpacing: '-2%' }],
        'subhead': ['48px', { lineHeight: '120%', letterSpacing: '-2%' }],
        'standfirst': ['24px', { lineHeight: '140%', letterSpacing: '0%' }],
        'body': ['16px', { lineHeight: '150%', letterSpacing: '0%' }],
        'cta-url': ['16px', { lineHeight: '100%', letterSpacing: '0%' }],
      },
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
       
        /* Primary Brand Colors */
        'crimson-red': 'hsl(var(--crimson-red))',
        'light-red': 'hsl(var(--light-red))',
        'creative-midnight': 'hsl(var(--creative-midnight))',
        'brand-black': 'hsl(var(--black))',
        'brand-grey': 'hsl(var(--grey))',
        'brand-white': 'hsl(var(--white))',
        'light-grey': 'hsl(var(--light-grey))',
        
        /* Secondary Brand Colors */
        'royal-purple': 'hsl(var(--royal-purple))',
        'light-purple': 'hsl(var(--light-purple))',
        'spring-green': 'hsl(var(--spring-green))',
        'light-green': 'hsl(var(--light-green))',
        'vivid-orange': 'hsl(var(--vivid-orange))',
        'light-orange': 'hsl(var(--light-orange))',
        'sunglow-yellow': 'hsl(var(--sunglow-yellow))',
        'light-yellow': 'hsl(var(--light-yellow))',
       
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))'
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))'
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))'
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))'
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))'
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))'
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))'
        },
        sidebar: {
          DEFAULT: 'hsl(var(--sidebar-background))',
          foreground: 'hsl(var(--sidebar-foreground))',
          primary: 'hsl(var(--sidebar-primary))',
          'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
          accent: 'hsl(var(--sidebar-accent))',
          'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
          border: 'hsl(var(--sidebar-border))',
          ring: 'hsl(var(--sidebar-ring))'
        }
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)'
      },
      keyframes: {
        'accordion-down': {
          from: {
            height: '0'
          },
          to: {
            height: 'var(--radix-accordion-content-height)'
          }
        },
        'accordion-up': {
          from: {
            height: 'var(--radix-accordion-content-height)'
          },
          to: {
            height: '0'
          }
        }
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out'
      }
    }
  },
  plugins: [require("tailwindcss-animate")],
}