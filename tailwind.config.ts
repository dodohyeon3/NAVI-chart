import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        navi: {
          bg:      '#0f0f1a',
          surface: '#1a1a2e',
          border:  '#2a2a45',
          accent:  '#6c63ff',
          green:   '#26a69a',
          red:     '#ef5350',
          text:    '#e2e8f0',
          muted:   '#94a3b8',
        },
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
    },
  },
  plugins: [],
}

export default config
