/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      colors: {
        bg: '#0A1628',
        'bg-elevated': '#0F1D32',
        surface: '#152238',
        fg: '#E8EDF5',
        'fg-dim': '#8899B4',
        accent: '#E8B86A',
        'accent-secondary': '#60A5FA',
        border: '#1E3050',
        'border-subtle': '#162640',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        'serif-display': ['Instrument Serif', 'serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
      },
    },
  },
  plugins: [],
};
