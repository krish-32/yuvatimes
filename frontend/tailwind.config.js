/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#DC143C',
          50: '#FCE0E6',
          100: '#F9C2CC',
          200: '#F28BA0',
          300: '#E95474',
          400: '#E0244E',
          500: '#DC143C',
          600: '#B00F2E',
          700: '#8A0B23',
          800: '#64081A',
          900: '#3E0510',
        },
        secondary: {
          DEFAULT: '#F75270',
          50: '#FEE3EA',
          100: '#FCC7D4',
          200: '#F995AB',
          300: '#F76388',
          400: '#F75270',
          500: '#E03355',
          600: '#B32744',
          700: '#861B33',
          800: '#5A1022',
          900: '#330814',
        },
        accent: {
          DEFAULT: '#F7CAC9',
          50: '#FDF4F4',
          100: '#FBE8E7',
          200: '#F7CAC9',
          300: '#F0A8A6',
          400: '#E78583',
          500: '#DE625F',
          600: '#C04A47',
          700: '#9A3A37',
          800: '#732A28',
          900: '#4D1B1A',
        },
        base: {
          DEFAULT: '#FDEBD0',
          50: '#FFFBF5',
          100: '#FEF5E7',
          200: '#FDEBD0',
          300: '#FAD9A8',
          400: '#F5C578',
          500: '#F0B048',
          600: '#D9952E',
          700: '#A87320',
          800: '#78521A',
          900: '#4A3210',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'Avenir', 'Helvetica', 'Arial', 'sans-serif'],
        display: ['Poppins', 'Inter', 'system-ui', 'sans-serif'],
      },
      backdropBlur: {
        xs: '2px',
      },
      boxShadow: {
        glass: '0 8px 32px 0 rgba(220, 20, 60, 0.15)',
        'glass-sm': '0 4px 16px 0 rgba(220, 20, 60, 0.10)',
        'glass-lg': '0 16px 48px 0 rgba(220, 20, 60, 0.20)',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-in': 'slideIn 0.3s ease-out',
        'scale-in': 'scaleIn 0.2s ease-out',
        'pulse-soft': 'pulseSoft 2s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideIn: {
          '0%': { transform: 'translateX(-100%)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.6' },
        },
      },
    },
  },
  plugins: [],
}
