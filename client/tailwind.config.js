/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        cyber: {
          bg: '#080a10',
          card: '#0f1422',
          border: '#1f293d',
          cyan: '#00f0ff',
          pink: '#ff0055',
          amber: '#ffb700',
          green: '#00ff66',
          muted: '#6b7280',
        },
      },
      fontFamily: {
        mono: ['Courier New', 'Courier', 'monospace'],
      },
      boxShadow: {
        'neon-cyan': '0 0 15px rgba(0, 240, 255, 0.4)',
        'neon-pink': '0 0 15px rgba(255, 0, 85, 0.4)',
        'neon-amber': '0 0 15px rgba(255, 183, 0, 0.4)',
      },
    },
  },
  plugins: [],
}
