"use client";

/**
 * Sugestões para aprovar, dentro do gerador.
 *
 * O problema que isto resolve: o gerador continuava sendo uma caixa de texto
 * vazia esperando alguém digitar. O sistema já sabia o que produzir (a fila
 * mede sinal, pontua e escreve briefing), mas essa capacidade morava em outra
 * tela e o editor não oferecia nada.
 *
 * Aqui a pauta aparece pronta: ângulo, plano slide a slide e direção de imagem.
 * Gerar só acontece depois do clique, porque gerar antes de aprovar gasta
 * crédito de IA desenhando algo que ninguém pediu.
 */
import { useCallback, useEffect, useState } from "react";
import { Lightbulb, Image as ImageIcon, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiJson } from "@/lib/auth/sessao";

interface Briefing {
  angulo?: string;
  gancho?: string;
  publico?: string;
  cta?: string;
  plano_slides?: { funcao?: string; ideia?: string }[];
  visual?: { tipo_imagem?: string; descricao?: string; paleta?: string };
}

interface ItemFila {
  id: string;
  estado: "ideia" | "rascunho" | "aprovado" | "publicado" | "descartado";
  briefing: Briefing | null;
  sinal_titulo: string | null;
  sinal_url: string | null;
  origem: string | null;
  pontuacao: string | number | null;
  sinal_id: string | null;
  slides: number;
}

const ORG = "autoclinic";
const ROTULO: Record<string, string> = {
  gancho: "gancho",
  contexto: "contexto",
  desenvolvimento: "desenvolvimento",
  virada: "virada",
  cta: "CTA",
};

export function SugestoesPanel({
  onDocumento,
}: {
  /** Recebe os slides gerados para o editor desenhar sem sair da tela. */
  onDocumento?: (slides: unknown) => void;
}) {
  const [itens, setItens] = useState<ItemFila[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [aberto, setAberto] = useState(true);

  const carregar = useCallback(async () => {
    setCarregando(true);
    try {
      const r = await apiJson<{ fila: ItemFila[] }>(`/conteudo/fila?org=${ORG}`);
      // Só o que ainda espera decisão: publicado e descartado não são sugestão.
      setItens((r.fila ?? []).filter((i) => i.estado === "ideia" || i.estado === "rascunho"));
    } catch {
      // Sem sessão ou API fora: o editor continua utilizável com a caixa de texto.
      setItens([]);
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const agir = async (chave: string, caminho: string, init: RequestInit) => {
    setOcupado(chave);
    setErro(null);
    try {
      const res = await fetch(`/api/ac${caminho}`, {
        ...init,
        headers: {
          "content-type": "application/json",
          ...(init.headers ?? {}),
        },
      });
      if (res.status === 401) {
        setErro("Sessão expirada. Entre de novo para usar as sugestões.");
        return false;
      }
      const corpo = (await res.json().catch(() => ({}))) as { erro?: string };
      if (!res.ok) throw new Error(corpo.erro ?? `Erro ${res.status}`);
      await carregar();
      return true;
    } catch (e) {
      setErro((e as Error).message);
      return false;
    } finally {
      setOcupado(null);
    }
  };

  const gerar = async (item: ItemFila) => {
    const ok = await agir(item.id, `/conteudo/fila/${item.id}/gerar?org=${ORG}`, {
      method: "POST",
      body: JSON.stringify({}),
    });
    if (!ok) return;
    // O documento gerado volta na leitura do item: é o que o editor desenha.
    try {
      const detalhe = await apiJson<{ item?: { documento?: { slides?: unknown } } }>(
        `/conteudo/fila/${item.id}?org=${ORG}`,
      );
      const slides = detalhe.item?.documento?.slides;
      if (slides) onDocumento?.(slides);
    } catch {
      // Sem documento na resposta o carrossel continua na fila; nada se perde.
    }
  };

  const planejar = async (item: ItemFila) => {
    if (!item.sinal_id) return;
    await agir(item.id, `/conteudo/briefing?org=${ORG}`, {
      method: "POST",
      body: JSON.stringify({ sinal_id: item.sinal_id }),
    });
  };

  if (carregando) {
    return (
      <p className="text-xs text-muted-foreground">Buscando sugestões prontas…</p>
    );
  }

  if (!itens.length) return null;

  return (
    <section className="w-full max-w-lg rounded-xl border bg-card text-left">
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        className="flex w-full items-center justify-between gap-2 px-4 py-3"
        aria-expanded={aberto}
      >
        <span className="flex items-center gap-2 text-sm font-semibold">
          <Lightbulb className="h-4 w-4" />
          Sugestões para aprovar
        </span>
        <span className="text-xs text-muted-foreground">
          {itens.length} pauta{itens.length === 1 ? "" : "s"}
        </span>
      </button>

      {aberto && (
        <div className="space-y-3 border-t px-4 py-3">
          {erro && (
            <p className="rounded-md border border-destructive/40 bg-destructive/5 px-2 py-1 text-xs text-destructive">
              {erro}
            </p>
          )}
          {itens.map((item) => {
            const b = item.briefing ?? {};
            const plano = b.plano_slides ?? [];
            const visual = b.visual;
            return (
              <article key={item.id} className="rounded-lg border p-3">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="min-w-0 text-sm font-medium leading-snug">
                    {b.angulo ?? item.sinal_titulo ?? "Pauta sem ângulo"}
                  </h3>
                  {item.pontuacao !== null && (
                    <span className="shrink-0 text-[10px] uppercase tracking-wide text-foreground/60">
                      nota {Number(item.pontuacao).toFixed(1).replace(".", ",")}
                    </span>
                  )}
                </div>

                {b.gancho && (
                  <p className="mt-1 text-xs text-foreground/70">
                    <span className="font-medium">Gancho:</span> {b.gancho}
                  </p>
                )}

                {plano.length > 0 ? (
                  <ol className="mt-2 space-y-0.5">
                    {plano.map((s, i) => (
                      <li key={i} className="flex gap-1.5 text-xs">
                        <span className="w-4 shrink-0 text-right text-foreground/50">{i + 1}</span>
                        <span className="min-w-0">
                          <span className="mr-1 rounded border px-1 text-[9px] uppercase tracking-wide text-foreground/60">
                            {ROTULO[s.funcao ?? ""] ?? s.funcao ?? "slide"}
                          </span>
                          {s.ideia}
                        </span>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p className="mt-2 text-xs text-foreground/60">
                    Sem plano de slides ainda. Planeje para ver o esqueleto antes de gerar.
                  </p>
                )}

                {visual?.descricao && (
                  <p className="mt-2 flex items-start gap-1.5 text-xs text-foreground/70">
                    <ImageIcon className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    <span>
                      <span className="font-medium">
                        {visual.tipo_imagem?.replace(/_/g, " ") ?? "imagem"}:
                      </span>{" "}
                      {visual.descricao}
                      {visual.paleta ? ` · paleta ${visual.paleta}` : ""}
                    </span>
                  </p>
                )}

                <div className="mt-2 flex flex-wrap gap-2">
                  {plano.length > 0 ? (
                    <Button size="sm" disabled={ocupado === item.id} onClick={() => gerar(item)}>
                      {ocupado === item.id ? "Gerando…" : "Gerar carrossel"}
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={ocupado === item.id}
                      onClick={() => planejar(item)}
                    >
                      <RefreshCw className="mr-1 h-3.5 w-3.5" />
                      Planejar
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive hover:bg-destructive/10"
                    disabled={ocupado === item.id}
                    onClick={() =>
                      agir(item.id, `/conteudo/fila/${item.id}?org=${ORG}`, {
                        method: "PATCH",
                        body: JSON.stringify({ estado: "descartado", motivo: "descartado no editor" }),
                      })
                    }
                  >
                    Descartar
                  </Button>
                  {item.sinal_url && (
                    <a
                      href={item.sinal_url}
                      target="_blank"
                      rel="noreferrer"
                      className="self-center text-xs text-foreground/60 underline underline-offset-2"
                    >
                      origem
                    </a>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
