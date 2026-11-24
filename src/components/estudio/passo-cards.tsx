"use client";

/**
 * Passo 2 do wizard: quantos cards e qual foto em cada um (issue #11).
 *
 * Dois controles, duas regras de produto:
 *
 *   1. **Quantidade** — stepper de 3 a 10 com o número visível no meio. Sem
 *      digitação livre: `input type="number"` aceita `999` e `-3`, e a pessoa
 *      digitaria `1` achando que virou um card só. O botão desabilita na borda
 *      em vez de aceitar e corrigir depois em silêncio.
 *   2. **Foto por card** — uma imagem por card, opcional. Cada card tem o seu
 *      próprio `<input type="file">` escondido, acionado por um `<button>` de
 *      44 px com `aria-label` completo ("Escolher imagem do card 3 — JPG, PNG
 *      ou WebP até 8 MB"): leitor de tela precisa saber QUAL card e QUAL limite.
 *
 * A imagem escolhida é reduzida no próprio navegador antes de virar `data:`.
 * Não é otimização de vaidade: 10 fotos de 8 MB em base64 são ~106 MB de corpo
 * no `POST` de salvamento, e o servidor guarda cada uma como arquivo irmão do
 * projeto. Reduzir para ~1,5 MB mantém o PNG final em 1080×1350 nítido e o
 * salvamento possível.
 */
import { useCallback, useRef, useState } from "react";

import {
  ACCEPT_IMAGEM,
  FORMATOS_LEGIVEIS,
  MAX_CARDS,
  MIN_CARDS,
  TAMANHO_MAX_MB,
  rotuloDoCard,
  alvoDaImagem,
} from "@/lib/estudio/cards";
import { imagemDeArquivo } from "@/lib/estudio/imagem-upload";

/* ------------------------------------------------------------------ */
/* Quantidade de cards                                                 */
/* ------------------------------------------------------------------ */

export function SeletorDeCards({
  quantidade,
  onMudar,
  desabilitado = false,
}: {
  quantidade: number;
  onMudar: (n: number) => void;
  desabilitado?: boolean;
}) {
  const noPiso = quantidade <= MIN_CARDS;
  const noTeto = quantidade >= MAX_CARDS;
  const conteudo = Math.max(0, quantidade - 2);

  const passo = (delta: number) => {
    const proximo = Math.min(MAX_CARDS, Math.max(MIN_CARDS, quantidade + delta));
    if (proximo !== quantidade) onMudar(proximo);
  };

  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <label className="text-[14px] font-semibold" style={{ color: "#1C1917" }}>
          Quantos cards?
        </label>
        <span className="text-[12px]" style={{ color: "#78716C" }}>
          7 é o que mais salva
        </span>
      </div>

      <div className="mt-2 flex items-center gap-3">
        <button
          type="button"
          onClick={() => passo(-1)}
          disabled={desabilitado || noPiso}
          data-menos-cards
          aria-label={`Tirar um card — hoje são ${quantidade}`}
          className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-[20px] font-semibold disabled:opacity-40"
          style={{ border: "1px solid #E7E5E4", backgroundColor: "#fff", color: "#1C1917" }}
        >
          −
        </button>

        {/* `output` + `aria-live`: quem não vê o número ouve a mudança. */}
        <output
          aria-live="polite"
          data-quantidade-cards={quantidade}
          className="min-w-[104px] rounded-xl px-4 py-2.5 text-center text-[20px] font-bold tabular-nums"
          style={{ backgroundColor: "#FFF7ED", color: "#C2410C", border: "1px solid #FED7AA" }}
        >
          {quantidade} {quantidade === 1 ? "card" : "cards"}
        </output>

        <button
          type="button"
          onClick={() => passo(1)}
          disabled={desabilitado || noTeto}
          data-mais-cards
          aria-label={`Colocar outro card — hoje são ${quantidade}`}
          className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-[20px] font-semibold disabled:opacity-40"
          style={{ border: "1px solid #E7E5E4", backgroundColor: "#fff", color: "#1C1917" }}
        >
          +
        </button>
      </div>

      <p className="mt-2 text-[12px]" style={{ color: "#57534E" }}>
        {quantidade === MIN_CARDS
          ? `${MIN_CARDS} é o mínimo: o primeiro card é a capa, o último fecha o carrossel e sobra ${conteudo} de conteúdo.`
          : `1 capa + ${conteudo} de conteúdo + 1 último card. Dá para ${MIN_CARDS} a ${MAX_CARDS}.`}
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Foto por card                                                       */
/* ------------------------------------------------------------------ */

export function FotosDosCards({
  imagens,
  onImagem,
  onOcupado,
  desabilitado = false,
}: {
  imagens: (string | null)[];
  /** `null` remove a foto do card. */
  onImagem: (indice: number, imagem: string | null) => void;
  /** Avisa a tela enquanto uma foto está sendo reduzida, para travar o "Gerar". */
  onOcupado?: (ocupado: boolean) => void;
  desabilitado?: boolean;
}) {
  const total = imagens.length;
  const [preparando, setPreparando] = useState<number | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const entradas = useRef<Record<number, HTMLInputElement | null>>({});

  const comFoto = imagens.filter(Boolean).length;

  const receber = useCallback(
    async (indice: number, arquivo: File | undefined | null) => {
      // Limpa o input antes de tudo: sem isso, escolher a MESMA foto de novo
      // depois de remover não dispara `change` e parece que o botão morreu.
      const entrada = entradas.current[indice];
      if (entrada) entrada.value = "";
      if (!arquivo) return;

      setErro(null);
      setPreparando(indice);
      onOcupado?.(true);
      const resultado = await imagemDeArquivo(arquivo);
      if (resultado.ok) {
        onImagem(indice, resultado.imagem);
      } else {
        setErro(`${rotuloDoCard(indice, total)}: ${resultado.motivo}`);
      }
      setPreparando(null);
      onOcupado?.(false);
    },
    [onImagem, onOcupado, total],
  );

  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <label className="text-[14px] font-semibold" style={{ color: "#1C1917" }}>
          Foto de cada card <span className="font-normal">(opcional)</span>
        </label>
        <span className="text-[12px]" style={{ color: "#78716C" }}>
          {comFoto === 0 ? "nenhuma foto ainda" : `${comFoto} de ${total} com foto`}
        </span>
      </div>

      <p className="mt-1 text-[12px]" style={{ color: "#57534E" }}>
        A foto vira o fundo do card e entra no PNG. Sem foto, o card usa as cores do template — nunca
        fica quebrado. {FORMATOS_LEGIVEIS}, até {TAMANHO_MAX_MB} MB por card.
      </p>

      <div aria-live="polite" role="alert" className="min-h-0">
        {erro ? (
          <p
            data-erro-fotos={erro}
            className="mt-2 rounded-lg px-3 py-2 text-[13px]"
            style={{ backgroundColor: "#FEF2F2", color: "#B91C1C", border: "1px solid #FCA5A5" }}
          >
            {erro}
          </p>
        ) : null}
      </div>

      <ul className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {imagens.map((imagem, i) => {
          const rotulo = rotuloDoCard(i, total);
          const alvo = alvoDaImagem(i, total);
          const ocupado = preparando === i;
          const temFoto = Boolean(imagem);
          const ariaLabel = `${temFoto ? "Trocar" : "Escolher"} imagem ${alvo} — ${FORMATOS_LEGIVEIS}, até ${TAMANHO_MAX_MB} MB`;

          return (
            <li
              key={i}
              className="overflow-hidden rounded-xl bg-white"
              style={{ border: "1px solid #E7E5E4" }}
              data-card-foto={i}
              data-tem-foto={temFoto ? "1" : "0"}
            >
              <div className="relative" style={{ aspectRatio: "4 / 5" }}>
                {temFoto ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={imagem ?? ""}
                    alt={`Prévia da imagem ${alvo}`}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div
                    className="grid h-full w-full place-items-center px-2 text-center"
                    style={{
                      background:
                        "repeating-linear-gradient(135deg, #FAFAF9 0 8px, #F5F5F4 8px 16px)",
                    }}
                  >
                    <span className="text-[12px] font-medium" style={{ color: "#A8A29E" }}>
                      sem foto
                    </span>
                  </div>
                )}

                {ocupado ? (
                  <div
                    className="absolute inset-0 grid place-items-center text-[12px] font-semibold"
                    style={{ backgroundColor: "#FFFFFFD9", color: "#C2410C" }}
                  >
                    Preparando…
                  </div>
                ) : null}

                <span
                  className="absolute left-1.5 top-1.5 rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide"
                  style={{ backgroundColor: "#1C1917E6", color: "#fff" }}
                >
                  {i + 1}
                </span>
              </div>

              <div className="p-1.5">
                <p
                  className="mb-1.5 truncate text-[11px] font-semibold"
                  style={{ color: "#57534E" }}
                  title={rotulo}
                >
                  {rotulo}
                </p>

                <button
                  type="button"
                  onClick={() => entradas.current[i]?.click()}
                  disabled={desabilitado || ocupado}
                  aria-label={ariaLabel}
                  className="min-h-[44px] w-full rounded-lg px-2 text-[12px] font-semibold disabled:opacity-40"
                  style={{ backgroundColor: "#FFF7ED", color: "#C2410C", border: "1px solid #FED7AA" }}
                >
                  {temFoto ? "Trocar" : "+ Foto"}
                </button>

                <input
                  ref={(el) => {
                    entradas.current[i] = el;
                  }}
                  type="file"
                  accept={ACCEPT_IMAGEM}
                  aria-label={`Arquivo de imagem ${alvo}`}
                  tabIndex={-1}
                  className="sr-only"
                  onChange={(e) => void receber(i, e.target.files?.[0])}
                />

                {temFoto ? (
                  <button
                    type="button"
                    onClick={() => {
                      setErro(null);
                      onImagem(i, null);
                    }}
                    disabled={desabilitado || ocupado}
                    aria-label={`Remover a imagem ${alvo}`}
                    className="mt-1.5 min-h-[44px] w-full rounded-lg px-2 text-[12px] font-semibold disabled:opacity-40"
                    style={{ border: "1px solid #E7E5E4", backgroundColor: "#fff", color: "#57534E" }}
                  >
                    Remover
                  </button>
                ) : (
                  // Placeholder invisível de mesma altura: sem ele a linha do
                  // tile muda de altura e a grade dança quando a foto entra.
                  <span aria-hidden className="mt-1.5 grid min-h-[44px] place-items-center text-[11px]" style={{ color: "#D6D3D1" }}>
                    —
                  </span>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      {total > 0 ? (
        <p className="mt-2 text-[12px]" style={{ color: "#78716C" }}>
          {comFoto === 0
            ? "Nenhuma foto ainda: o carrossel funciona igual, só com as cores do template."
            : `Cada foto é reduzida sozinha antes de entrar no card — os ${TAMANHO_MAX_MB} MB são o teto do arquivo que você escolhe.`}
        </p>
      ) : null}
    </div>
  );
}
