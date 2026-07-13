/** @type {import('tailwindcss').Config} */
module.exports = {
 darkMode: ['class'],
 content: [
   './pages/**/*.{js,jsx}',
   './components/**/*.{js,jsx}',
   './app/**/*.{js,jsx}',
   './src/**/*.{js,jsx}',
 ],
 theme: {
   container: {
     center: true,
     padding: '2rem',
     screens: {
       '2xl': '1400px',
     },
   },
   extend: {
     fontFamily: {
       sans: ['"DM Sans"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
       display: ['Fraunces', 'Georgia', 'serif'],
     },
     colors: {
       /* ===== PCV Brand Palette: Alba (warm ivory) + Maroon #8E0100 ===== */
       alba: {
         50: '#FDFBF7',
         100: '#F8F4EC',
         200: '#EFE7D9',
         300: '#E2D6C2',
         400: '#CBB999',
       },
       maroon: {
         50: '#FBF1F0',
         100: '#F4DEDC',
         200: '#E6B8B4',
         300: '#D28A84',
         400: '#B54038',
         500: '#A11C13',
         600: '#8E0100',
         700: '#740100',
         800: '#5A0100',
         900: '#420000',
       },
       gold: {
         100: '#F7EFD8',
         200: '#EBDCA8',
         400: '#C9A227',
         600: '#9A7B1C',
       },
       /* ===== shadcn tokens ===== */
       border: 'hsl(var(--border))',
       input: 'hsl(var(--input))',
       ring: 'hsl(var(--ring))',
       background: 'hsl(var(--background))',
       foreground: 'hsl(var(--foreground))',
       primary: {
         DEFAULT: 'hsl(var(--primary))',
         foreground: 'hsl(var(--primary-foreground))',
       },
       secondary: {
         DEFAULT: 'hsl(var(--secondary))',
         foreground: 'hsl(var(--secondary-foreground))',
       },
       destructive: {
         DEFAULT: 'hsl(var(--destructive))',
         foreground: 'hsl(var(--destructive-foreground))',
       },
       muted: {
         DEFAULT: 'hsl(var(--muted))',
         foreground: 'hsl(var(--muted-foreground))',
       },
       accent: {
         DEFAULT: 'hsl(var(--accent))',
         foreground: 'hsl(var(--accent-foreground))',
       },
       popover: {
         DEFAULT: 'hsl(var(--popover))',
         foreground: 'hsl(var(--popover-foreground))',
       },
       card: {
         DEFAULT: 'hsl(var(--card))',
         foreground: 'hsl(var(--card-foreground))',
       },
       sidebar: {
         DEFAULT: 'hsl(var(--sidebar-background))',
         foreground: 'hsl(var(--sidebar-foreground))',
         primary: 'hsl(var(--sidebar-primary))',
         'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
         accent: 'hsl(var(--sidebar-accent))',
         'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
         border: 'hsl(var(--sidebar-border))',
         ring: 'hsl(var(--sidebar-ring))',
       },
     },
     borderRadius: {
       lg: 'var(--radius)',
       md: 'calc(var(--radius) - 2px)',
       sm: 'calc(var(--radius) - 4px)',
     },
     boxShadow: {
       card: '0 1px 2px rgba(66, 32, 6, 0.04), 0 4px 16px rgba(66, 32, 6, 0.06)',
       'card-hover': '0 2px 4px rgba(66, 32, 6, 0.06), 0 12px 32px rgba(66, 32, 6, 0.12)',
     },
     keyframes: {
       'accordion-down': {
         from: {
           height: '0',
         },
         to: {
           height: 'var(--radix-accordion-content-height)',
         },
       },
       'accordion-up': {
         from: {
           height: 'var(--radix-accordion-content-height)',
         },
         to: {
           height: '0',
         },
       },
       'fade-in': {
         from: { opacity: '0', transform: 'translateY(6px)' },
         to: { opacity: '1', transform: 'translateY(0)' },
       },
     },
     animation: {
       'accordion-down': 'accordion-down 0.2s ease-out',
       'accordion-up': 'accordion-up 0.2s ease-out',
       'fade-in': 'fade-in 0.25s ease-out both',
     },
   },
 },
 plugins: [require('tailwindcss-animate')],
};
