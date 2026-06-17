/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      animation: {
        'live':       'livepulse  2s   ease-in-out infinite',
        'kpiflash':   'kpiflash   2s   ease-in-out infinite',
        'slidein':    'slidein    0.28s cubic-bezier(.2,.8,0,1.08) forwards',
        'pulsebadge': 'pulsebadge 1.4s ease-in-out infinite',
        'fadeup':     'fadeup     0.35s ease forwards',
      },
      keyframes: {
        livepulse:  {
          '0%,100%': { boxShadow: '0 0 0 0 rgba(16,185,129,0.4)' },
          '60%':     { boxShadow: '0 0 0 6px rgba(16,185,129,0)' },
        },
        kpiflash: {
          '0%,100%': { boxShadow: 'none' },
          '50%':     { boxShadow: '0 0 28px 6px rgba(244,63,94,0.35)' },
        },
        slidein: {
          from: { transform: 'translateX(112%)', opacity: '0' },
          to:   { transform: 'translateX(0)',    opacity: '1' },
        },
        pulsebadge: {
          '0%,100%': { transform: 'scale(1)' },
          '50%':     { transform: 'scale(0.92)' },
        },
        fadeup: {
          from: { opacity: '0', transform: 'translateY(10px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
}
