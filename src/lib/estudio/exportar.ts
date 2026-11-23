"use client";

/**
 * Export dos cards em PNG 1080x1350 (issue #12).
 *
 * O que o alvo faz e a gente copia: um PNG por slide, e a opção de baixar todos.
 * "Todos" sai em ZIP porque o navegador bloqueia vários downloads seguidos —
 * um clique, um arquivo, que é o que o Instagram pede depois.
 *
 * ## De onde saem os 1350 (e não os 1440 do card)
 *
 * O card é desenhado em 3:4 (1080x1440), mas o PNG é a JANELA 4:5 recortada
 * dessa arte — `EXPORT_W x EXPORT_H`. O palco de export já entrega o nó no
 * tamanho da janela (wrapper de 1080x1350 com `overflow: hidden` e o card
 * deslocado para cima pela sangria), então aqui basta rasterizar nesse tamanho:
 * `width`/`height` do html-to-image não recortam, eles definem o SVG que recebe
 * o nó. Recortar no palco é o que garante PNG de 1080x1350 de verdade.
 *
 * `document.fonts.ready` antes de rasterizar não é zelo: fonte ainda carregando
 * vira Arial no PNG, e o card que a pessoa aprovou na tela sai diferente.
 *
 * ## Espera o layout assentar, não só a fonte (W98)
 *
 * O encaixe do texto é MEDIDO (`bloco-texto.tsx`): o tamanho de fonte de cada
 * bloco é decidido depois de medir o texto com a fonte real. `document.fonts.ready`
 * resolve no microtask, antes do React aplicar o estado dessa medição — rasterizar
 * ali pegava o card com o tamanho de partida, cortado, enquanto a tela já mostrava
 * o reduzido. Dois frames depois do `fonts.ready` o layout está assentado: é o que
 * faz o PNG sair igual ao que a pessoa viu. Custo: ~32 ms por card.
 */
import { toCanvas } from "html-to-image";
import JSZip from "jszip";
import { EXPORT_H, EXPORT_W } from "@/lib/estudio/area-segura";

/**
 * Fonte carregada E layout assentado.
 *
 * `requestAnimationFrame` duas vezes: o primeiro frame aplica o estado medido no
 * commit do React, o segundo garante que o navegador já pagou o layout. Um só
 * frame funciona na maioria das vezes — "na maioria" não serve para o arquivo que
 * a pessoa posta.
 */
async function prontoParaRasterizar() {
  await document.fonts.ready;
  await new Promise<void>((ok) => requestAnimationFrame(() => requestAnimationFrame(() => ok())));
}

async function cardParaBlob(node: HTMLElement): Promise<Blob | null> {
  try {
    const canvas = await toCanvas(node, {
      width: EXPORT_W,
      height: EXPORT_H,
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
  await prontoParaRasterizar();
  const blob = await cardParaBlob(node);
  if (!blob) return;
  baixar(blob, `${nomeBaseDoCarrossel(titulo)}-${String(indice + 1).padStart(2, "0")}.png`);
}

/** Todos os cards num ZIP. */
export async function baixarTodosOsCards(nodes: HTMLElement[], titulo: string) {
  await prontoParaRasterizar();
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
