"use client";

/**
 * Seletor de formato do carrossel.
 *
 * Por que existe: até aqui a pessoa escolhia template (visual) e tema (assunto),
 * e o formato ficava implícito — o modelo escrevia o que quisesse, e o que saía
 * era um carrossel sem estrutura: hook fraco no primeiro slide, miolo repetido,
 * CTA morno. Formato é a decisão que falta entre "sobre o que" e "com que cara":
 * lista, passo a passo, caso real, opinião, cheat sheet, história, quiz.
 *
 * Três decisões de produto, todas da revisão do critic (22/11):
 *   1. Não mostrar 12 nichos × 9 formatos de uma vez. Aparecem até 4 formatos, com
 *      o sugerido primeiro, e o resto atrás de "ver todos". Quem abre o app quer o
 *      carrossel, não um curso de taxonomia.
 *   2. O sugerido vem do TEMA ("5 erros" é lista, "como fazer" é passo a passo),
 *      não da mediana do nicho — senão quase todo carrossel sairia em cheat sheet.
 *   3. "Novidade" e "Antes e depois" ficam fora da lista curta: o gerador não tem
 *      busca (inventaria notícia) e antes/depois depende de foto do usuário.
 *
 * Nada aqui bloqueia: sem escolha, a geração segue o formato sugerido.
 */

import { useMemo, useState } from "react";
import {
  FORMATOS_LISTA,
  NICHOS_LISTA,
  formatoPorId,
  nichoPorId,
  sugerirFormatoDoTema,
} from "@/lib/estudio/formatos";

export function SeletorDeFormato({
  nicho,
  formato,
  tema,
  onNicho,
  onFormato,
}: {
  nicho: string;
  formato: string;
  tema: string;
  onNicho: (id: string) => void;
  onFormato: (id: string) => void;
}) {
  const [expandido, setExpandido] = useState(false);
  const nichoAtual = nichoPorId(nicho);
  const sugeridoId = sugerirFormatoDoTema(tema);
  const escolhido = formatoPorId(formato);

  /** Ordem: sugerido, depois os do nicho (ou todos), sem repetir e sem os ocultos. */
  const visiveis = useMemo(() => {
    const base = nichoAtual
      ? nichoAtual.formatos.map(({ id, mediana }) => ({ formato: formatoPorId(id), mediana }))
      : FORMATOS_LISTA.map((f) => ({ formato: f, mediana: f.evidencia }));

    const limpos = base.filter(
      (x): x is { formato: NonNullable<ReturnType<typeof formatoPorId>>; mediana: string } =>
        Boolean(x.formato),
    );

    const sugerido = limpos.find((x) => x.formato.id === sugeridoId);
    const resto = limpos.filter((x) => x.formato.id !== sugeridoId);
    const ordenado = sugerido ? [sugerido, ...resto] : resto;

    if (expandido) return ordenado;
    // Lista curta: o sugerido + os primeiros que não são ocultos, até 4.
    return ordenado.filter((x) => !x.formato.escondidoDoPadrao).slice(0, 4);
  }, [nichoAtual, sugeridoId, expandido]);

  const ocultos = useMemo(
    () =>
      (nichoAtual
        ? nichoAtual.formatos.map(({ id }) => formatoPorId(id))
        : FORMATOS_LISTA
      ).filter((f): f is NonNullable<ReturnType<typeof formatoPorId>> => Boolean(f?.escondidoDoPadrao)),
    [nichoAtual],
  );

  return (
    <section
      className="rounded-2xl bg-white p-5 sm:p-7"
      style={{ boxShadow: "0 10px 30px rgba(0,0,0,.06)" }}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2
          className="text-[13px] font-semibold uppercase tracking-[0.14em]"
          style={{ color: "#57534E" }}
        >
          Formato do carrossel
        </h2>
        <span className="text-[12px]" style={{ color: "#78716C" }}>
          {escolhido ? `escolhido: ${escolhido.nome}` : "sem escolha: a IA usa o formato sugerido"}
        </span>
      </div>
      <p className="mt-2 text-[13px] leading-snug" style={{ color: "#57534E" }}>
        Formato é a estrutura que faz o carrossel ser salvo em vez de só rolado. Escolha o nicho
        (opcional) e o formato — cada um mostra como começa.
      </p>

      <div className="mt-3 flex gap-2 overflow-x-auto pb-2 pr-4">
        <button
          type="button"
          onClick={() => {
            onNicho("");
          }}
          aria-pressed={!nicho}
          className="min-h-[44px] shrink-0 rounded-lg px-3.5 py-2.5 text-[12px] font-semibold"
          style={{
            backgroundColor: !nicho ? "#1C1917" : "#FFFFFF",
            color: !nicho ? "#FFFFFF" : "#57534E",
            border: "1px solid #E7E5E4",
          }}
        >
          Todos os nichos
        </button>
        {NICHOS_LISTA.map((n) => {
          const ativo = n.id === nicho;
          return (
            <button
              key={n.id}
              type="button"
              onClick={() => onNicho(ativo ? "" : n.id)}
              aria-pressed={ativo}
              className="min-h-[44px] shrink-0 rounded-lg px-3.5 py-2.5 text-[12px] font-semibold"
              style={{
                backgroundColor: ativo ? "#1C1917" : "#FFFFFF",
                color: ativo ? "#FFFFFF" : "#57534E",
                border: "1px solid #E7E5E4",
              }}
            >
              {n.nome}
            </button>
          );
        })}
      </div>

      <div className="mt-2 grid gap-2 sm:grid-cols-2">
        {visiveis.map(({ formato: f, mediana }) => {
          const ativo = f.id === formato;
          const ehSugerido = f.id === sugeridoId;
          return (
            <button
              key={f.id}
              type="button"
              onClick={() => onFormato(ativo ? "" : f.id)}
              aria-pressed={ativo}
              className="min-h-[44px] rounded-xl px-3 py-2.5 text-left"
              style={{
                backgroundColor: ativo ? "#FFF7ED" : "#FFFFFF",
                border: ativo ? "2px solid #F4511E" : "1px solid #E7E5E4",
              }}
            >
              <span className="flex items-baseline justify-between gap-2">
                <span className="text-[14px] font-semibold" style={{ color: "#1C1917" }}>
                  {f.nome}
                </span>
                {ehSugerido && !formato ? (
                  <span
                    className="shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-semibold"
                    style={{ backgroundColor: "#FFF1E9", color: "#C2410C" }}
                  >
                    Sugerido
                  </span>
                ) : (
                  <span
                    className="shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-semibold"
                    style={{ backgroundColor: "#F5F5F4", color: "#57534E" }}
                    title="Desempenho medido no topcarousels.com (22/11/2026). Mediana da biblioteca curada, subconjunto — não é a amostra total."
                  >
                    {mediana}
                  </span>
                )}
              </span>
              <span className="mt-1 block text-[12px] leading-snug" style={{ color: "#57534E" }}>
                “{f.exemplo}”
              </span>
            </button>
          );
        })}
      </div>

      {escolhido ? (
        <p className="mt-2 text-[12px] leading-snug" style={{ color: "#78716C" }}>
          Atenção: {escolhido.limite}
        </p>
      ) : null}

      <button
        type="button"
        onClick={() => setExpandido((v) => !v)}
        className="mt-2 min-h-[44px] text-[13px] font-semibold"
        style={{ color: "#C2410C" }}
      >
        {expandido
          ? "Ver menos formatos"
          : `Ver todos os formatos${ocultos.length ? " (inclui os que não recomendamos)" : ""}`}
      </button>
    </section>
  );
}
