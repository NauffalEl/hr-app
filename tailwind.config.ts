import type { Config } from 'tailwindcss';

// Token design system §2: warna pakai palet Tailwind default (blue/slate/emerald/amber/red/sky).
// Hanya font Inter yang perlu extend.
const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;
