/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './components/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        surface:     '#0f0f0f',
        'surface-100': '#1a1a1a',
        'surface-200': '#242424',
        'surface-300': '#2e2e2e',
        accent:      '#f97316',
        'accent-hover': '#ea6c0a',
        muted:       '#6b7280',
      },
    },
  },
  plugins: [],
}
