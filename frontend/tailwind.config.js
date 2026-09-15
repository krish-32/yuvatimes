/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#84934A',
          50: '#f2f4ec',
          100: '#e6e9d9',
          200: '#ccd2b2',
          300: '#b3bc8c',
          400: '#99a565',
          500: '#84934A',
          600: '#6a763b',
          700: '#4f582c',
          800: '#353b1e',
          900: '#1a1d0f',
        },
        secondary: {
          DEFAULT: '#656D3F',
          50: '#f0f1ec',
          100: '#e1e3d9',
          200: '#c2c7b3',
          300: '#a4aa8c',
          400: '#858e66',
          500: '#656D3F',
          600: '#515732',
          700: '#3d4126',
          800: '#282c19',
          900: '#14160c',
        },
        accent: {
          DEFAULT: '#492828',
          50: '#edeaea',
          100: '#dcd4d4',
          200: '#b8a8a8',
          300: '#957d7d',
          400: '#715151',
          500: '#492828',
          600: '#3a2020',
          700: '#2c1818',
          800: '#1d1010',
          900: '#0e0808',
        },
        base: {
          DEFAULT: '#ECECEC',
          50: '#fcfcfc',
          100: '#f9f9f9',
          200: '#f2f2f2',
          300: '#ebebeb',
          400: '#e5e5e5',
          500: '#ECECEC',
          600: '#bdbdbd',
          700: '#8e8e8e',
          800: '#5e5e5e',
          900: '#2f2f2f',
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
        glass: '0 8px 32px 0 rgba(132, 147, 74, 0.15)',
        'glass-sm': '0 4px 16px 0 rgba(132, 147, 74, 0.10)',
        'glass-lg': '0 16px 48px 0 rgba(132, 147, 74, 0.20)',
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
