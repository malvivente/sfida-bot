/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        epic: {
          bg: '#0e1015',
          card: '#151821',
          cardLight: '#1d2230',
          border: '#242b3d',
          borderLight: '#323b52',
          purple: '#7059e2',
          purpleLight: '#8b75fb',
          blue: '#2563eb',
          cyan: '#06b6d4',
          gold: '#f59e0b',
          goldLight: '#fbbf24',
          orange: '#ea580c',
          green: '#10b981',
          pink: '#f43f5e',
          muted: '#94a3b8',
        },
        cyber: {
          bg: '#0e1015',
          card: '#151821',
          border: '#242b3d',
          cyan: '#06b6d4',
          pink: '#f43f5e',
          amber: '#f59e0b',
          green: '#10b981',
          muted: '#94a3b8',
        },
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'Inter', 'system-ui', 'sans-serif'],
        heading: ['Outfit', '"Plus Jakarta Sans"', 'sans-serif'],
        orbitron: ['Outfit', '"Plus Jakarta Sans"', 'sans-serif'],
        rajdhani: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
        chakra: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        'epic-purple': '0 8px 24px -4px rgba(112, 89, 226, 0.45)',
        'epic-gold': '0 8px 24px -4px rgba(245, 158, 11, 0.4)',
        'epic-cyan': '0 8px 24px -4px rgba(6, 182, 212, 0.4)',
        'neon-cyan': '0 4px 14px rgba(6, 182, 212, 0.35)',
        'neon-pink': '0 4px 14px rgba(244, 63, 94, 0.35)',
        'neon-amber': '0 4px 14px rgba(245, 158, 11, 0.35)',
      },
    },
  },
  plugins: [],
}
