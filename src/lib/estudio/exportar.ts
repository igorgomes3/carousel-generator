"use client";

/**
 * Export dos cards em PNG 1080x1350.
 *
 * O que o alvo faz e a gente copia: um PNG por slide, e a opção de baixar todos.
 * "Todos" sai em ZIP porque o navegador bloqueia vários downloads seguidos —
 * um clique, um arquivo, que é o que o Instagram pede depois.
 *
 * `document.fonts.ready` antes de rasterizar não é zelo: fonte ainda carregando
 * vira Arial no PNG, e o card que a pessoa aprovou na tela sai diferente.
 */
import { toCanvas } from "html-to-image";
import JSZip from "jszip";
import { ALTURA_CARD, LARGURA_CARD } from "@/components/estudio/cartao";

async function cardParaBlob(node: HTMLElement): Promise<Blob | null> {
  try {
    const canvas = await toCanvas(node, {
      width: LARGURA_CARD,
      height: ALTURA_CARD,
      pixelRatio: 1,
      cacheBust: true,
      skipFonts: false,
    });
    return await new Promise((ok) => canvas.toBlob(ok, "image/png"));
  } catch (e) {
    console.error("[estudio] falha ao converter card em PNG:", e);
    return null;
  }
}

function baixar(blob: Blob, nome: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nome;
  a.click();
  URL.revokeObjectURL(url);
}

export function nomeBaseDoCarrossel(titulo: string): string {
  const limpo = titulo
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase()
    .slice(0, 60);
  return limpo || "carrossel";
}

/** Um card só. */
export async function baixarUmCard(node: HTMLElement, titulo: string, indice: number) {
  await document.fonts.ready;
  const blob = await cardParaBlob(node);
  if (!blob) return;
  baixar(blob, `${nomeBaseDoCarrossel(titulo)}-${String(indice + 1).padStart(2, "0")}.png`);
}

/** Todos os cards num ZIP. */
export async function baixarTodosOsCards(nodes: HTMLElement[], titulo: string) {
  await document.fonts.ready;
  const base = nomeBaseDoCarrossel(titulo);
  const zip = new JSZip();
  const blobs = await Promise.all(nodes.map((n) => cardParaBlob(n)));

  let dentro = 0;
  blobs.forEach((blob, i) => {
    if (!blob) return;
    dentro += 1;
    zip.file(`${base}-${String(i + 1).padStart(2, "0")}.png`, blob);
  });

  if (!dentro) return;
  const conteudo = await zip.generateAsync({ type: "blob" });
  baixar(conteudo, `${base}.zip`);
}
