import daisyui from 'daisyui'

export default {
  content: ['./index.html', './src/**/*.{vue,ts}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['Cinzel', 'Georgia', 'serif'],
        flavor: ['"IM Fell English SC"', 'Georgia', 'serif'],
      },
    },
  },
  plugins: [daisyui],
  daisyui: {
    logs: false,
    themes: [
      {
        regicide: {
          'color-scheme': 'dark',
          primary: '#c9a227',          // tarnished gold — royalty, earned
          'primary-content': '#1a1405',
          secondary: '#7d2a2a',        // dried blood
          'secondary-content': '#f3e3c3',
          accent: '#4e7c74',           // verdigris bronze
          'accent-content': '#0d1614',
          neutral: '#211d33',
          'neutral-content': '#cfc7e8',
          'base-100': '#161226',       // raised surfaces
          'base-200': '#0f0c1d',       // page
          'base-300': '#0b0918',       // deepest
          'base-content': '#d8d2ea',
          info: '#5a8bd6',
          success: '#5f9e54',
          warning: '#d08a2e',
          error: '#b03434',
        },
      },
    ],
  },
}
