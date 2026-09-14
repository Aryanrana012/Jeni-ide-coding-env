/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        background: '#09090B',
        primary: '#F4F4F5',
        secondary: '#A1A1AA',
        muted: '#71717A',
        success: '#22C55E',
        error: '#EF4444',
        surface: {
          DEFAULT: '#111113',
          highlight: '#18181B',
          border: '#222225',
          muted: '#0D0D0F'
        },
        accent: {
          DEFAULT: '#8B5CF6',
          hover: '#A78BFA',
          light: '#A78BFA',
          glow: 'rgba(139, 92, 246, 0.12)'
        },
        jeni: {
          purple: '#8b5cf6',
          cyan: '#A78BFA',
          glow: 'rgba(139, 92, 246, 0.12)'
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['Fira Code', 'JetBrains Mono', 'Consolas', 'monospace']
      }
    },
  },
  plugins: [],
}
