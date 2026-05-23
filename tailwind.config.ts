import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      colors: {
        ink: {
          50: '#f6f6f7',
          100: '#e2e2e6',
          200: '#c4c5cc',
          300: '#9c9ea9',
          400: '#73757f',
          500: '#5a5c66',
          600: '#404249',
          700: '#2b2c31',
          800: '#1a1b1f',
          900: '#0e0f12',
          950: '#08090b',
        },
        accent: {
          DEFAULT: '#a78bfa',
          soft: '#c4b5fd',
          deep: '#7c3aed',
        },
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
