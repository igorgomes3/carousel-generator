import type { Metadata } from "next";

import { MeusProjetos } from "@/components/projetos/meus-projetos";

/**
 * `/projetos` — Meus projetos.
 *
 * Antes essa rota era um `301` para `/` (a galeria tinha virado a home). A
 * issue #13 devolve o endereço: o estúdio cria, esta tela é onde a pessoa
 * volta para abrir, renomear e apagar o que salvou.
 *
 * `force-dynamic` porque a lista depende do cookie `estudio_dono`: nada aqui
 * pode nascer estático nem ser cacheado por CDN.
 */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Meus projetos — Carrossel",
  description: "Os carrosséis que você salvou: abrir, renomear e apagar.",
};

export default function PaginaMeusProjetos() {
  return <MeusProjetos />;
}
