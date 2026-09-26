/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: '#1A110C',
          soft: '#3D2E24',
          mute: '#6B5344',
        },
        paper: {
          DEFAULT: '#FFF8F2',
          warm: '#FFEFE3',
          deep: '#F3E2D2',
        },
        chili: {
          400: '#EF5A3C',
          500: '#D6361F',
          600: '#B02A16',
        },
        mustard: {
          300: '#F0C85A',
          400: '#E3B23C',
          500: '#C9971F',
        },
        frost: {
          50: '#F2FBFA',
          100: '#D9F2EE',
          200: '#A8DED6',
          400: '#3BA899',
          600: '#1F7A6E',
          800: '#0F4A43',
          900: '#0A2E2A',
        },
        charcoal: {
          950: '#140f0c',
          900: '#1c1512',
          800: '#2a211c',
          700: '#3d3129',
        },
        turmeric: {
          300: '#F0C85A',
          400: '#E3B23C',
          500: '#C9971F',
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
