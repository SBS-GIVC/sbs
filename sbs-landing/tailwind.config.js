/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        "primary": "#137fec",
        "primary-hover": "#0f6fd4",
        "primary-light": "#e6f3ff",
        "background-light": "#f6f7f8",
        "background-dark": "#101922",
        "surface-dark": "#182430",
        "surface-light": "#ffffff",
        "surface-lighter": "#233648",
        "surface-darker": "#0d1218",
        "error": "#ef4444",
        "success": "#22c55e",
        "warning": "#f59e0b",
        "info": "#3b82f6",
        "text-secondary": "#94a3b8",
        "secondary-text": "#92adc9",
        "border-dark": "#233648",
        slate: {
          950: '#0f172a',
        }
      },
      fontFamily: {
        "display": ["Manrope", "Inter", "sans-serif"],
        "mono": ["ui-monospace", "SFMono-Regular", "Menlo", "Monaco", "Consolas", "Liberation Mono", "Courier New", "monospace"],
        "body": ["Inter", "system-ui", "sans-serif"],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'pulse': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'spin': 'spin 1s linear infinite',
        'shimmer': 'shimmer 2s infinite linear',
        'gradient': 'gradient-shift 3s ease infinite',
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
        'bounce-subtle': 'bounce-subtle 2s ease-in-out infinite',
        'fade-in': 'fade-in 0.5s ease-out',
        'slide-up': 'slide-in-from-bottom-4 0.5s ease-out',
        'zoom-in': 'zoom-in-95 0.3s ease-out',
      },
      borderRadius: {
        "DEFAULT": "0.5rem",
        "lg": "0.75rem",
        "xl": "1rem",
        "2xl": "1.25rem",
        "full": "9999px"
      },
      boxShadow: {
        'soft': '0 2px 8px rgba(0, 0, 0, 0.06)',
        'medium': '0 4px 12px rgba(0, 0, 0, 0.08)',
        'large': '0 8px 24px rgba(0, 0, 0, 0.12)',
        'glow': '0 0 20px rgba(19, 127, 236, 0.3)',
        'glow-lg': '0 0 30px rgba(19, 127, 236, 0.4)',
      },
      backdropBlur: {
        xs: '2px',
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '128': '32rem',
      },
      transitionDuration: {
        '400': '400ms',
      },
    },
  },
  plugins: [],
}
