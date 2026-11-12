import "./globals.css";
import type { Metadata } from "next";
import {
  PT_Serif,
  Roboto,
  Roboto_Condensed,
  Syne,
  Ultra,
  Archivo_Black,
  Montserrat,
} from "next/font/google";
import localFont from "next/font/local";
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
 * Inter variável local, o mesmo woff2 do mockup aprovado (docs/design/mockups/
 * fonts/Inter-variable.woff2). Local e não next/font/google por duas razões: o
 * build não depende de rede para pegar a fonte, e a tela sai com os mesmos
 * pesos 400/500/600 do contrato visual — a versão do Google trazia só 500 e 700.
 */
const inter = localFont({
  src: "./fonts/Inter-variable.woff2",
  display: "swap",
  variable: "--font-inter",
  weight: "100 900",
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
    <html lang="en">
      <body
        className={`${dm_sans.variable} ${dm_serif_display.variable} ${pt_serif.variable} ${roboto.variable} ${roboto_condensed.variable} ${inter.variable} ${arquivoBlack.variable} ${syne.variable} ${montserrat.variable}  ${GeistSans.variable} flex flex-col min-h-screen items-stretch justify-between antialiased}`}
      >
        <div className="flex-1 h-full flex flex-col justify-stretch ">
          {children}
        </div>
        <Toaster />
      </body>
    </html>
  );
}