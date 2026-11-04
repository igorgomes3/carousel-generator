"use client";

/**
 * Painel do plano: mostra o que o pipeline decidiu ANTES de escrever.
 *
 * Por que existe: o gerador rodava seis etapas (ângulo, esqueleto, copy, direção
 * visual, montagem, publicação) e nada disso aparecia na tela. Do lado de quem
 * usa, "gerar" continuava sendo uma caixa de texto e um botão, idêntico ao
 * prompt único antigo. O trabalho existia no código e não existia na interface.
 *
 * O que este painel NÃO faz: editar o plano. Mudar o plano aqui não reescreveria
 * os slides, e prometer controle que não existe é pior que não ter controle.
 */
import { useState } from "react";
import { ChevronDown, ChevronUp, Copy, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePlanoContext } from "@/lib/providers/plano-context";

const ROTULO_FUNCAO: Record<string, string> = {
  gancho: "Gancho",
  contexto: "Contexto",
  desenvolvimento: "Desenvolvimento",
  virada: "Virada",
  cta: "CTA",
};

export function PlanoPanel() {
  const { plano } = usePlanoContext();
  const [aberto, setAberto] = useState(true);
  const [copiado, setCopiado] = useState(false);

  if (!plano) return null;

  const { ideia, plano: planoSlides, criativo, publicacao } = plano;

  const copiarPublicacao = async () => {
    if (!publicacao) return;
    const texto = [publicacao.legenda, "", publicacao.hashtags.join(" ")].join("\n");
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      // Sem clipboard (http ou permissão negada): a legenda está visível na tela.
    }
  };

  return (
    <section className="w-full max-w-lg rounded-xl border bg-card text-left">
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        className="flex w-full items-center justify-between gap-2 px-4 py-3"
        aria-expanded={aberto}
      >
        <span className="flex items-center gap-2 text-sm font-semibold">
          <Sparkles className="h-4 w-4" />
          Plano do conteúdo
        </span>
        <span className="flex items-center gap-2 text-xs text-muted-foreground">
          6 etapas
          {aberto ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </span>
      </button>

      {aberto && (
        <div className="space-y-4 border-t px-4 py-3">
          <div className="space-y-1">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-foreground/60">
              Ângulo
            </h3>
            <p className="text-sm">{ideia.angulo}</p>
            <dl className="mt-2 grid gap-1 text-xs text-foreground/70">
              <div className="flex gap-1">
                <dt className="font-medium">Público:</dt>
                <dd>{ideia.publico}</dd>
              </div>
              <div className="flex gap-1">
                <dt className="font-medium">Dor:</dt>
                <dd>{ideia.dor}</dd>
              </div>
              <div className="flex gap-1">
                <dt className="font-medium">Promessa:</dt>
                <dd>{ideia.promessa}</dd>
              </div>
              <div className="flex gap-1">
                <dt className="font-medium">Tom:</dt>
                <dd>{ideia.tom}</dd>
              </div>
            </dl>
          </div>

          <div className="space-y-1">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-foreground/60">
              Slide a slide
            </h3>
            <ol className="space-y-1">
              {planoSlides.slides.map((s) => (
                <li key={s.posicao} className="flex gap-2 text-sm">
                  <span className="w-5 shrink-0 text-right text-xs text-foreground/50">
                    {s.posicao}
                  </span>
                  <span className="min-w-0">
                    <span className="mr-1 rounded border px-1 py-0.5 text-[10px] uppercase tracking-wide text-foreground/70">
                      {ROTULO_FUNCAO[s.funcao] ?? s.funcao}
                    </span>
                    {s.ideia}
                  </span>
                </li>
              ))}
            </ol>
          </div>

          <div className="space-y-1">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-foreground/60">
              Direção visual
            </h3>
            {criativo ? (
              <>
                <p className="text-xs text-foreground/70">
                  Paleta {criativo.paleta_sugerida} · ritmo {criativo.ritmo} · imagem{" "}
                  {criativo.imagem.replace(/_/g, " ")}
                </p>
                <p className="text-sm">{criativo.justificativa}</p>
              </>
            ) : (
              <p className="text-xs text-foreground/60">
                Esta etapa não veio nesta geração. Os slides continuam válidos.
              </p>
            )}
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-foreground/60">
                Publicação
              </h3>
              {publicacao && (
                <Button size="sm" variant="ghost" onClick={copiarPublicacao}>
                  <Copy className="mr-1 h-3.5 w-3.5" />
                  {copiado ? "Copiado" : "Copiar legenda"}
                </Button>
              )}
            </div>
            {publicacao ? (
              <>
                <p className="whitespace-pre-wrap text-sm">{publicacao.legenda}</p>
                <p className="text-xs text-foreground/70">{publicacao.hashtags.join(" ")}</p>
                <p className="text-xs text-foreground/70">
                  Melhor horário: {publicacao.melhor_horario}
                </p>
              </>
            ) : (
              <p className="text-xs text-foreground/60">
                Legenda não veio nesta geração. Gere de novo para tentar a etapa de publicação.
              </p>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
