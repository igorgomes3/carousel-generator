/** @type {import('tailwindcss').Config} */
/**
 * Direção A — Neutro denso.
 *
 * Nenhum valor de cor, raio, tamanho de texto, espaço ou sombra nasce aqui: o
 * config só aponta para as variáveis CSS que `scripts/build-tokens.mjs` gera a
 * partir de `design-tokens.json`. Assim existe um lugar para mudar o produto, e
 * um hex solto num componente aparece no diff como anomalia.
 */
module.exports = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        canvas: "hsl(var(--canvas))",
        subtle: "hsl(var(--subtle))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      borderRadius: {
        DEFAULT: "var(--radius)",
        sm: "var(--radius-sm)",
        md: "var(--radius-md)",
        lg: "var(--radius-lg)",
        xl: "var(--radius-xl)",
        pill: "var(--radius-pill)",
      },
      fontSize: {
        meta: ["var(--text-meta)", { lineHeight: "var(--leading-meta)" }],
        body: ["var(--text-body)", { lineHeight: "var(--leading-body)" }],
        control: ["var(--text-control)", { lineHeight: "var(--leading-control)" }],
        "card-title": [
          "var(--text-card-title)",
          { lineHeight: "var(--leading-card-title)", letterSpacing: "-0.01em" },
        ],
        "page-title": [
          "var(--text-page-title)",
          { lineHeight: "var(--leading-page-title)", letterSpacing: "-0.025em" },
        ],
      },
      spacing: {
        row: "var(--space-row)",
        card: "var(--space-card-pad)",
        section: "var(--space-section)",
        page: "var(--space-page)",
        touch: "var(--space-touch)",
        inspector: "var(--size-inspector)",
        topbar: "var(--size-topbar)",
        thumb: "var(--size-thumb)",
        filmstrip: "var(--size-filmstrip)",
      },
      boxShadow: {
        card: "var(--shadow-card)",
        popover: "var(--shadow-popover)",
        slide: "var(--shadow-slide)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: 0 },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: 0 },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        "dm-sans": ["var(--font-dm-sans)"],
        "dm-serif-display": ["var(--font-dm-serif-display)"],
        "geist-sans": ["var(--font-geist-sans)"],
        montserrat: ["var(--font-montserrat)"],
        "pt-serif": ["var(--font-pt-serif)"],
        roboto: ["var(--font-roboto)"],
        "roboto-condensed": ["var(--font-roboto-condensed)"],
        ultra: ["var(--font-ultra)"],
        inter: ["var(--font-inter)"],
        syne: ["var(--font-syne)"],
        "archivo-black": ["var(--font-archivo-black)"],
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
