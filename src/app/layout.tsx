import "./globals.css";
import type { Metadata } from "next";
import {
  Inter,
  PT_Serif,
  Roboto,
  Roboto_Condensed,
  Syne,
  Ultra,
  Archivo_Black,
  Montserrat,
} from "next/font/google";
import { GeistSans, GeistMono } from "geist/font";
import { Toaster } from "@/components/ui/toaster";
import { DM_Sans, DM_Serif_Display } from "next/font/google";

const dm_sans = DM_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-dm-sans",
  weight: "variable",
});

const dm_serif_display = DM_Serif_Display({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-dm-serif-display",
  weight: "400",
});

const montserrat = Montserrat({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-montserrat",
  weight: ["500", "700", "900"],
});

const pt_serif = PT_Serif({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-pt-serif",
  weight: ["400", "700"],
});

const roboto = Roboto({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-roboto",
  weight: ["500", "700"],
});

/**
 * Inter variável, pesos 400–900.
 *
 * Voltou para `next/font/google` de propósito: a versão local
 * (`next/font/local`) emitia o `@font-face` com `url()` relativo, e o
 * html-to-image da exportação faz `new URL(url)` sem base — o export de PNG
 * quebrava com "Failed to construct 'URL': Invalid URL". A versão do Google é
 * auto-hospedada pelo Next com URL absoluta, que é o que o export precisa.
 * Sem `weight`, o Next entrega a fonte variável completa (400/500/600).
 */
const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

const arquivoBlack = Archivo_Black({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-archivo-black",
  weight: "400",
});

const ultra = Ultra({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-ultra",
  weight: "400",
});

const roboto_condensed = Roboto_Condensed({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-roboto-condensed",
  weight: ["400", "700"],
});

const syne = Syne({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-syne",
  weight: ["500", "700"],
});

export const metadata: Metadata = {
  ...(process.env.NEXT_PUBLIC_APP_URL && {
    metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL),
  }),
  title: "Carousel Generator",
  description: "An open source carousel maker for LinkedIn",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // As variáveis do `next/font` precisam ficar no <html>: `tokens.css`
    // declara `--font-sans: var(--font-inter)` em `:root`, e uma var() dentro
    // de custom property é resolvida no elemento onde a declaração vive. Com
    // as variáveis no <body>, `--font-sans` computa vazio no `:root` e herda
    // vazio — a interface toda cai em Times New Roman.
    <html
      lang="en"
      className={`${dm_sans.variable} ${dm_serif_display.variable} ${pt_serif.variable} ${roboto.variable} ${roboto_condensed.variable} ${inter.variable} ${arquivoBlack.variable} ${syne.variable} ${montserrat.variable} ${GeistSans.variable}`}
    >
      <body
        className="flex flex-col min-h-screen items-stretch justify-between antialiased"
      >
        <div className="flex-1 h-full flex flex-col justify-stretch ">
          {children}
        </div>
        <Toaster />
      </body>
    </html>
  );
}