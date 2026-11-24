/**
 * Upload de imagem do dispositivo → data URI pronto para o card.
 *
 * Existe porque a imagem do card não pode depender da IA: quem já tem a foto
 * (produto, cliente, banheiro do consultório) precisa poder usar a dela. O
 * mesmo caminho serve ao passo 2 do wizard e ao editor de resultado — duas
 * implementações divergiriam no dia em que o limite mudasse.
 *
 * Regras (as mesmas de `lib/estudio/cards.ts`, que é a fonte):
 * - valida tipo e tamanho ANTES de comprimir, com frase de gente;
 * - reduz para 1600 px no maior lado com qualidade 0.82 (o card tem 1080 de
 *   largura e a imagem entra como fundo com recorte, então 1600 dá margem);
 * - recusa se depois da redução ainda passar de 2 MB: guardar base64 gigante
 *   quebra o export e o salvamento.
 */
import imageCompression from "browser-image-compression";

import {
  RECUSA_APOS_REDUCAO,
  TETO_REDUZIDO_BYTES,
  validarArquivo,
} from "@/lib/estudio/cards";

function paraDataUrl(arquivo: Blob): Promise<string> {
  return new Promise((ok, falha) => {
    const leitor = new FileReader();
    leitor.onload = () => ok(String(leitor.result ?? ""));
    leitor.onerror = () => falha(new Error("Não conseguimos ler o arquivo."));
    leitor.readAsDataURL(arquivo);
  });
}

export type ResultadoImagem =
  | { ok: true; imagem: string }
  | { ok: false; motivo: string };

/** Valida, reduz e devolve o data URI — ou o motivo da recusa, em português. */
export async function imagemDeArquivo(arquivo: File): Promise<ResultadoImagem> {
  const validacao = validarArquivo({
    nome: arquivo.name,
    tipo: arquivo.type,
    tamanho: arquivo.size,
  });
  if (!validacao.ok) return { ok: false, motivo: validacao.motivo };

  try {
    const reduzida = await imageCompression(arquivo, {
      maxWidthOrHeight: 1600,
      initialQuality: 0.82,
      maxSizeMB: 1.5,
      useWebWorker: false,
    });
    if (reduzida.size > TETO_REDUZIDO_BYTES) {
      return { ok: false, motivo: RECUSA_APOS_REDUCAO };
    }
    return { ok: true, imagem: await paraDataUrl(reduzida) };
  } catch {
    return { ok: false, motivo: RECUSA_APOS_REDUCAO };
  }
}
