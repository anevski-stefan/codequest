export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      colors: {
        'app':      '#171923',
        'sidebar':  '#1D2030',
        'base':     '#252836',
        'surface':  '#2E3245',
        'elevated': '#363B52',
      },
      transitionTimingFunction: {
        'spring': 'cubic-bezier(0.16, 1, 0.3, 1)',
      },
    }
  },
  plugins: [require('tailwind-scrollbar')({
    nocompatible: true
  }), require('@tailwindcss/typography')]
};