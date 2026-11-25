"use client";

/**
 * Bloco "Legenda e hashtags" — o texto que o criador cola no Instagram.
 *
 * Existe porque o produto promete post pronto, não só imagens: quem baixa os
 * cards ainda precisaria escrever a legenda, que é metade do trabalho. O texto
 * nasce na etapa 6 do pipeline e viaja junto com o carrossel (salvo no projeto,
 * visível também no link público).
 *
 * Decisões de tela:
 * - `textarea readOnly` e não `<p>`: o texto tem quebra de linha de verdade e a
 *   pessoa precisa conseguir selecionar do jeito de sempre.
 * - Botão de copiar por bloco (legenda, hashtags, tudo) porque colar as hashtags
 *   separadas é o que a maioria faz — o Instagram trata as duas partes igual.
 * - Falha de clipboard é silenciosa em navegador sem permissão; por isso o
 *   aviso é texto na tela, não `alert`.
 */
import { useCallback, useState } from "react";

import { textoParaColar } from "@/lib/estudio/publicacao";

const COR = {
  tinta: "#1C1917",
  suave: "#57534E",
  fraco: "#6B6660",
  borda: "#E7E5E4",
  acao: "#0E7490",
  ok: "#166534",
};

export function BlocoPublicacao({
  legenda,
  hashtags,
  melhorHorario,
  compacto = false,
}: {
  legenda?: string;
  hashtags?: string[];
  melhorHorario?: string;
  /** No link público o bloco é mais discreto: quem abre não vai editar nada. */
  compacto?: boolean;
}) {
  const [copiado, setCopiado] = useState<string | null>(null);
  const tags = hashtags ?? [];

  const copiar = useCallback(async (rotulo: string, texto: string) => {
    if (!texto) return;
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(rotulo);
      setTimeout(() => setCopiado(null), 2500);
    } catch {
      setCopiado("falhou");
      setTimeout(() => setCopiado(null), 4000);
    }
  }, []);

  if (!legenda && tags.length === 0) return null;

  const tagsTexto = tags.join(" ");

  return (
    <section
      aria-labelledby="bloco-publicacao-titulo"
      className="rounded-2xl bg-white p-4"
      style={{ border: `1px solid ${COR.borda}` }}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="bloco-publicacao-titulo" className="text-[15px] font-semibold" style={{ color: COR.tinta }}>
          Legenda e hashtags
        </h2>
        {melhorHorario ? (
          <span className="text-[12px]" style={{ color: COR.fraco }}>
            Melhor horário: {melhorHorario}
          </span>
        ) : null}
      </div>
      <p className="mt-1 text-[12px]" style={{ color: COR.suave }}>
        Pronto para colar no Instagram junto com os cards.
      </p>

      {legenda ? (
        <div className="mt-3">
          <label className="block text-[12px] font-semibold uppercase tracking-[0.12em]" style={{ color: COR.fraco }}>
            Legenda
          </label>
          <textarea
            readOnly
            value={legenda}
            rows={compacto ? 4 : 5}
            aria-label="Legenda do post"
            className="mt-1 w-full resize-y rounded-xl px-3 py-2 text-[14px] leading-relaxed"
            style={{ border: `1px solid ${COR.borda}`, color: COR.tinta, backgroundColor: "#FDFCFB" }}
          />
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void copiar("legenda", legenda)}
              className="min-h-[40px] rounded-lg px-3 py-2 text-[13px] font-semibold"
              style={{ backgroundColor: "#1C1917", color: "#FFFFFF" }}
            >
              Copiar legenda
            </button>
            {tagsTexto ? (
              <button
                type="button"
                onClick={() => void copiar("hashtags", tagsTexto)}
                className="min-h-[40px] rounded-lg px-3 py-2 text-[13px] font-semibold"
                style={{ border: `1px solid ${COR.borda}`, color: COR.tinta, backgroundColor: "#FFFFFF" }}
              >
                Copiar hashtags
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => void copiar("tudo", textoParaColar(legenda, tags))}
              className="min-h-[40px] rounded-lg px-3 py-2 text-[13px] font-semibold"
              style={{ border: `1px solid ${COR.borda}`, color: COR.acao, backgroundColor: "#FFFFFF" }}
            >
              Copiar tudo
            </button>
          </div>
        </div>
      ) : null}

      {tags.length > 0 ? (
        <div className="mt-3">
          <span className="block text-[12px] font-semibold uppercase tracking-[0.12em]" style={{ color: COR.fraco }}>
            Hashtags
          </span>
          <p className="mt-1 flex flex-wrap gap-1.5">
            {tags.map((tag) => (
              <span
                key={tag}
                className="rounded-md px-2 py-1 text-[13px]"
                style={{ backgroundColor: "#F5F4F1", color: COR.tinta }}
              >
                {tag}
              </span>
            ))}
          </p>
        </div>
      ) : null}

      <p role="status" aria-live="polite" className="mt-2 text-[12px] font-semibold" style={{ color: copiado === "falhou" ? "#B91C1C" : COR.ok, minHeight: 18 }}>
        {copiado === "falhou"
          ? "O navegador bloqueou a cópia. Selecione o texto e copie manualmente."
          : copiado
            ? "Copiado — cole no Instagram."
            : ""}
      </p>
    </section>
  );
}
