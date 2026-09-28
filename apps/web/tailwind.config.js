/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          purple: '#1B042C',
          deep: '#130222',
          card: '#24073B',
          surface: '#2E0A4B',
          border: 'rgba(245, 184, 0, 0.3)',
        },
        gold: {
          300: '#FFE082',
          400: '#FFD54F',
          500: '#F5B800',
          600: '#E0A300',
          700: '#C68B00',
        },
        ink: {
          DEFAULT: '#140224',
          soft: '#26063F',
          mute: '#58387A',
        },
        paper: {
          DEFAULT: '#1B042C',
          warm: '#24073B',
          deep: '#2F0B4C',
        },
        chili: {
          400: '#FFD54F',
          500: '#F5B800',
          600: '#E0A300',
        },
        mustard: {
          300: '#FFE082',
          400: '#FFD54F',
          500: '#F5B800',
        },
        frost: {
          50: '#2A0B45',
          100: '#341054',
          200: '#4D1A78',
          400: '#F5B800',
          600: '#E0A300',
          800: '#1B042C',
          900: '#120220',
        },
        charcoal: {
          950: '#0F011A',
          900: '#140224',
          800: '#1C0432',
          700: '#280746',
        },
        turmeric: {
          300: '#FFE082',
          400: '#FFD54F',
          500: '#F5B800',
        },
      },
      fontFamily: {
        display: ['var(--font-fraunces)', 'Georgia', 'serif'],
        sans: ['var(--font-dm-sans)', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        float: '0 18px 50px rgba(26, 17, 12, 0.18)',
        lift: '0 8px 28px rgba(26, 17, 12, 0.12)',
      },
      keyframes: {
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
        steam: {
          '0%, 100%': { opacity: '0.35', transform: 'translateY(0)' },
          '50%': { opacity: '0.7', transform: 'translateY(-8px)' },
        },
      },
      animation: {
        shimmer: 'shimmer 1.4s infinite',
        steam: 'steam 3.2s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
