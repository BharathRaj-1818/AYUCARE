/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./public/index.html"
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Manrope', 'system-ui', 'sans-serif'],
        serif: ['Merriweather', 'Georgia', 'serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
        xl: '1rem',
        '2xl': '1.5rem',
      },
      colors: {
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))'
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))'
        },
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
          50: '#F2F7F4',
          100: '#E1EDE5',
          200: '#C3DBC9',
          300: '#9FC4A9',
          400: '#76A685',
          500: '#528562',
          600: '#3A6647',
          700: '#2F5233',
          800: '#26422A',
          900: '#1F3623',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
          50: '#FAF6F0',
          100: '#F4EAD9',
          200: '#EBD5B0',
          300: '#E0BF86',
          400: '#D4A373',
          500: '#C28A55',
          600: '#A66F3D',
          700: '#8A5830',
          800: '#6E4425',
          900: '#54331B',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))'
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))'
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))'
        },
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        chart: {
          '1': 'hsl(var(--chart-1))',
          '2': 'hsl(var(--chart-2))',
          '3': 'hsl(var(--chart-3))',
          '4': 'hsl(var(--chart-4))',
          '5': 'hsl(var(--chart-5))'
        },
        ayur: {
          green: {
            50: '#F2F7F4',
            100: '#E1EDE5',
            200: '#C3DBC9',
            300: '#9FC4A9',
            400: '#76A685',
            500: '#528562',
            600: '#3A6647',
            700: '#2F5233',
            800: '#26422A',
            900: '#1F3623',
          },
          sand: {
            50: '#FAF6F0',
            100: '#F4EAD9',
            200: '#EBD5B0',
            300: '#E0BF86',
            400: '#D4A373',
            500: '#C28A55',
          },
          cream: '#FAFAF5',
        },
        success: '#4F772D',
        warning: '#E9C46A',
        error: '#BC4749',
        info: '#90A955',
      },
      boxShadow: {
        'soft': '0 4px 20px -4px rgba(47, 82, 51, 0.1)',
        'card': '0 2px 8px -2px rgba(0, 0, 0, 0.05)',
        'elevated': '0 10px 40px -10px rgba(47, 82, 51, 0.15)',
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' }
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' }
        },
        'fade-in': {
          from: { opacity: '0', transform: 'translateY(10px)' },
          to: { opacity: '1', transform: 'translateY(0)' }
        },
        'slide-in-left': {
          from: { opacity: '0', transform: 'translateX(-20px)' },
          to: { opacity: '1', transform: 'translateX(0)' }
        },
        'scale-in': {
          from: { opacity: '0', transform: 'scale(0.95)' },
          to: { opacity: '1', transform: 'scale(1)' }
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        'fade-in': 'fade-in 0.3s ease-out',
        'slide-in-left': 'slide-in-left 0.3s ease-out',
        'scale-in': 'scale-in 0.2s ease-out',
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '128': '32rem',
      }
    }
  },
  plugins: [require("tailwindcss-animate")],
};
