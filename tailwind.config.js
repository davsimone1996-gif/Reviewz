/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        surface: {
          DEFAULT: '#0f0f0f',
          50: '#1a1a1a',
          100: '#242424',
          200: '#2e2e2e',
          300: '#383838',
        },
        accent: {
          DEFAULT: '#e8602c',
          hover: '#f0743e',
        },
        muted: '#6b7280',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

