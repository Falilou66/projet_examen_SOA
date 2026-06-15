/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      animation: {
        'live':      'livepulse 2s ease-in-out infinite',
        'kpiflash':  'kpiflash 1.8s ease-in-out infinite',
        'slidein':   'slidein 0.3s ease',
        'pulsebadge':'pulsebadge 2s infinite',
      },
      keyframes: {
        livepulse: {
          '0%,100%': { opacity: '1',   boxShadow: '0 0 6px #10b981' },
          '50%':     { opacity: '0.4', boxShadow: '0 0 2px #10b981' },
        },
        kpiflash: {
          '0%,100%': { boxShadow: '0 0 0 0   rgba(244,63,94,0.25)' },
          '50%':     { boxShadow: '0 0 0 6px rgba(244,63,94,0)'    },
        },
        slidein: {
          from: { transform: 'translateX(110%)', opacity: '0' },
          to:   { transform: 'translateX(0)',    opacity: '1' },
        },
        pulsebadge: {
          '0%,100%': { opacity: '1' },
          '50%':     { opacity: '0.6' },
        },
      },
    },
  },
  plugins: [],
}
