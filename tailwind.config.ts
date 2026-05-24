import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      colors: {
        // light surface palette
        paper: {
          50: '#ffffff',
          100: '#fafaf7',
          200: '#f3f1ec',
          300: '#e8e5dd',
          400: '#d4d0c5',
          500: '#a8a499',
          600: '#7a7670',
          700: '#4d4a45',
          800: '#2e2c29',
          900: '#1a1916',
        },
        accent: {
          DEFAULT: '#10b981',
          soft: '#6ee7b7',
          deep: '#047857',
          tint: '#d1fae5',
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
