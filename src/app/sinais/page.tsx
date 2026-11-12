"use client";

/**
 * Fila de conteúdo.
 *
 * O que esta tela resolve: hoje o carrossel nasce do que alguém digita. Aqui o
 * conteúdo nasce de um sinal real (tendência ou notícia), com pontuação
 * explicável, e só vira carrossel depois de uma pessoa aprovar.
 *
 * Regra dura: nada publica sozinho. O estado máximo que o robô cria é `ideia`;
 * `aprovado` só existe por clique, e `publicado` é decisão de quem opera.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  apiFetch,
  apiJson,
  garantirSessao,
  usuarioAtual,
  type UsuarioCarrossel,
} from "@/lib/auth/sessao";
import { Button } from "@/components/ui/button";
import { NavPrincipal } from "@/components/carrosseis/nav-principal";
import { Input } from "@/components/ui/input";

interface Sinal {
  id: string;
  origem: string;
  url: string;
  titulo: string;
  trecho: string | null;
  pontuacao: string | number;
  componentes: { relevancia?: number; recencia?: number; novidade?: number };
  na_fila: boolean;
}

interface Briefing {
  angulo?: string;
  publico?: string;
  dor?: string;
  promessa?: string;
  cta?: string;
  gancho?: string;
  tom?: string;
}

interface ItemFila {
  id: string;
  estado: "ideia" | "rascunho" | "aprovado" | "publicado" | "descartado";
  briefing: Briefing | null;
  motivo_descarte: string | null;
  agendado_para: string | null;
  sinal_id: string | null;
  sinal_titulo: string | null;
  sinal_url: string | null;
  origem: string | null;
  pontuacao: string | number | null;
  componentes: Sinal["componentes"] | null;
  slides: number;
  carrossel_id: string | null;
  criado_em: string;
}

interface MetricaFonte {
  origem: string;
  itens: number;
  aprovados: number;
  descartados: number;
  taxa_aprovacao: number | null;
  revisar: boolean;
  amostra_suficiente: boolean;
}

const ROTULO_ESTADO: Record<ItemFila["estado"], string> = {
  ideia: "Ideia",
  rascunho: "Rascunho",
  aprovado: "Aprovado",
  publicado: "Publicado",
  descartado: "Descartado",
};

const COR_ESTADO: Record<ItemFila["estado"], string> = {
  ideia: "bg-slate-100 text-slate-700 border-slate-300",
  rascunho: "bg-amber-50 text-amber-800 border-amber-300",
  aprovado: "bg-emerald-50 text-emerald-800 border-emerald-300",
  publicado: "bg-blue-50 text-blue-800 border-blue-300",
  descartado: "bg-muted text-muted-foreground border-border",
};

function nota(v: string | number | null): string {
  if (v === null || v === undefined) return "—";
  const n = typeof v === "string" ? Number(v) : v;
  return Number.isFinite(n) ? n.toFixed(1).replace(".", ",") : "—";
}

export default function FilaPage() {
  const router = useRouter();
  const [usuario, setUsuario] = useState<UsuarioCarrossel | null>(null);
  const [fila, setFila] = useState<ItemFila[]>([]);
  const [sinais, setSinais] = useState<Sinal[]>([]);
  const [fontes, setFontes] = useState<MetricaFonte[]>([]);
  const [calendario, setCalendario] = useState<
    { id: string; estado: string; agendado_para: string; titulo: string }[]
  >([]);
  const [carregando, setCarregando] = useState(true);
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [descartando, setDescartando] = useState<string | null>(null);
  const [motivo, setMotivo] = useState("");
  const [confirmandoPublicar, setConfirmandoPublicar] = useState<string | null>(null);
  const [filtro, setFiltro] = useState<string>("todos");
  const [config, setConfig] = useState({ obrigatorias: "", proibidas: "", max: 3 });
  const [padrao, setPadrao] = useState<{
    resumo: string;
    amostra: number;
    gerado_em: string;
    estrutura: { gancho?: { padrao?: string }; cta?: string; densidade_texto?: string; evitar?: string[] };
  } | null>(null);

  const org = "autoclinic";

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    try {
      const [f, s, m, c, cfg, pad] = await Promise.all([
        apiJson<{ fila: ItemFila[] }>(`/conteudo/fila?org=${org}`),
        apiJson<{ sinais: Sinal[] }>(`/conteudo/sinais?org=${org}&limite=15`),
        apiJson<{ fontes: MetricaFonte[] }>(`/conteudo/metricas?org=${org}`),
        apiJson<{ itens: { id: string; estado: string; agendado_para: string; titulo: string }[] }>(
          `/conteudo/calendario?org=${org}`,
        ),
        apiJson<{ config: { palavras_obrigatorias: string[]; palavras_proibidas: string[]; max_por_dia: number } }>(
          `/conteudo/config?org=${org}`,
        ),
        apiJson<{ padrao: typeof padrao }>(`/conteudo/padrao?org=${org}`),
      ]);
      setFila(f.fila ?? []);
      setSinais(s.sinais ?? []);
      setFontes(m.fontes ?? []);
      setCalendario(c.itens ?? []);
      setConfig({
        obrigatorias: (cfg.config?.palavras_obrigatorias ?? []).join(", "),
        proibidas: (cfg.config?.palavras_proibidas ?? []).join(", "),
        max: cfg.config?.max_por_dia ?? 3,
      });
      setPadrao(pad.padrao ?? null);
    } catch (e) {
      setErro((e as Error).message);
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    (async () => {
      const ok = await garantirSessao();
      if (!ok) {
        router.replace("/login?de=/sinais");
        return;
      }
      setUsuario(usuarioAtual());
      await carregar();
    })();
  }, [carregar, router]);

  const agir = async (chave: string, caminho: string, init: RequestInit) => {
    setOcupado(chave);
    setAviso(null);
    setErro(null);
    try {
      const res = await apiFetch(caminho, init);
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

  const coletar = async () => {
    setOcupado("coletar");
    setAviso(null);
    setErro(null);
    try {
      const r = await apiJson<{ lidos: number; novos: number; bloqueados_por_filtro: number }>(
        `/conteudo/coletar?org=${org}`,
        { method: "POST", body: JSON.stringify({}) },
      );
      setAviso(
        `${r.lidos} sinal(is) lido(s), ${r.novos} novo(s)` +
          (r.bloqueados_por_filtro ? `, ${r.bloqueados_por_filtro} barrado(s) pelo filtro` : ""),
      );
      await carregar();
    } catch (e) {
      setErro((e as Error).message);
    } finally {
      setOcupado(null);
    }
  };

  const salvarConfig = async () => {
    await agir("config", `/conteudo/config?org=${org}`, {
      method: "POST",
      body: JSON.stringify({
        palavras_obrigatorias: config.obrigatorias.split(",").map((p) => p.trim()).filter(Boolean),
        palavras_proibidas: config.proibidas.split(",").map((p) => p.trim()).filter(Boolean),
        max_por_dia: config.max,
      }),
    });
    setAviso("Filtro salvo.");
  };

  const visiveis = useMemo(
    () => (filtro === "todos" ? fila : fila.filter((i) => i.estado === filtro)),
    [fila, filtro],
  );

  const hoje = new Date().toISOString().slice(0, 10);
  const semana = useMemo(() => {
    const dias: string[] = [];
    const base = new Date();
    for (let i = 0; i < 7; i++) {
      const d = new Date(base);
      d.setDate(base.getDate() + i);
      dias.push(d.toISOString().slice(0, 10));
    }
    return dias;
  }, []);

  return (
    <main className="min-h-screen bg-muted/30">
      {/* Nav compartilhada: três destinos + e-mail + Sair (§1.2). Antes esta
          tela tinha uma barra própria com "Meus carrosséis" apontando para
          /projetos — vocabulário e rota que a fase 1 remove. */}
      <NavPrincipal usuario={usuario} />

      <div className="mx-auto max-w-5xl px-4 py-6 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-lg font-semibold">Sinais e pautas</h1>
            <p className="text-sm text-muted-foreground">
              Pauta nasce de sinal real, passa por briefing e só vira carrossel com aprovação. Nada
              publica sozinho.
            </p>
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={coletar} disabled={ocupado === "coletar"}>
              {ocupado === "coletar" ? "Coletando…" : "Coletar agora"}
            </Button>
            <Button size="sm" variant="ghost" onClick={carregar} disabled={carregando}>
              Atualizar
            </Button>
          </div>
        </div>

        {aviso && (
          <p className="rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
            {aviso}
          </p>
        )}
        {erro && (
          <p className="rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
            {erro}
          </p>
        )}

        {/* Filtro de nicho: é o que impede pauta fora do alvo de entrar na fila. */}
        <section className="rounded-xl border bg-card p-4">
          <h2 className="text-sm font-semibold">Filtro de nicho</h2>
          <p className="text-xs text-muted-foreground mb-3">
            Palavra proibida elimina o sinal antes de entrar na fila. Os termos de busca restringem
            o que a coleta procura.
          </p>
          <div className="grid gap-3 sm:grid-cols-[1fr_1fr_120px]">
            <label className="text-xs">
              <span className="text-muted-foreground">Termos de busca</span>
              <Input
                value={config.obrigatorias}
                onChange={(e) => setConfig({ ...config, obrigatorias: e.target.value })}
                placeholder="clinica de estetica, harmonizacao"
                className="mt-1"
              />
            </label>
            <label className="text-xs">
              <span className="text-muted-foreground">Palavras proibidas</span>
              <Input
                value={config.proibidas}
                onChange={(e) => setConfig({ ...config, proibidas: e.target.value })}
                placeholder="futebol, politica"
                className="mt-1"
              />
            </label>
            <label className="text-xs">
              <span className="text-muted-foreground">Itens por dia</span>
              <Input
                type="number"
                inputMode="numeric"
                min={1}
                max={10}
                value={config.max}
                onChange={(e) => setConfig({ ...config, max: Number(e.target.value) })}
                className="mt-1 max-w-[120px]"
              />
            </label>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="mt-3"
            onClick={salvarConfig}
            disabled={ocupado === "config"}
          >
            Salvar filtro
          </Button>
        </section>

        {/* Fila */}
        <section className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            {["todos", "ideia", "rascunho", "aprovado", "publicado", "descartado"].map((f) => (
              <button
                key={f}
                onClick={() => setFiltro(f)}
                className={`rounded-full border px-3 py-1 text-xs ${
                  filtro === f ? "bg-foreground text-background border-foreground" : "bg-card"
                }`}
              >
                {f === "todos" ? "Todos" : ROTULO_ESTADO[f as ItemFila["estado"]]} (
                {f === "todos" ? fila.length : fila.filter((i) => i.estado === f).length})
              </button>
            ))}
          </div>

          {carregando ? (
            <p className="text-sm text-muted-foreground">Carregando…</p>
          ) : visiveis.length === 0 ? (
            <p className="rounded-xl border border-dashed bg-card p-8 text-center text-sm text-muted-foreground">
              Nada na fila com esse filtro. Use “Coletar agora” para buscar sinais novos.
            </p>
          ) : (
            visiveis.map((item) => (
              <article key={item.id} className="rounded-xl border bg-card p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`shrink-0 rounded-md border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${COR_ESTADO[item.estado]}`}
                      >
                        {ROTULO_ESTADO[item.estado]}
                      </span>
                      <span className="text-xs text-foreground/70">
                        entrada {new Date(item.criado_em).toLocaleDateString("pt-BR")} · nota{" "}
                        {nota(item.pontuacao)}
                        {item.componentes
                          ? ` · relevância ${nota(item.componentes.relevancia ?? null)} · recência ${nota(
                              item.componentes.recencia ?? null,
                            )} · novidade ${nota(item.componentes.novidade ?? null)}`
                          : ""}
                      </span>
                    </div>
                    <h3 className="mt-1 font-medium leading-snug">{item.sinal_titulo ?? "Sem sinal"}</h3>
                    {item.sinal_url && (
                      <a
                        href={item.sinal_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-foreground/70 underline underline-offset-2"
                      >
                        {item.origem ?? "origem"}
                      </a>
                    )}
                    {item.briefing?.angulo && (
                      <p className="mt-2 text-sm">
                        <span className="font-medium text-foreground/70">Ângulo: </span>
                        {item.briefing.angulo}
                      </p>
                    )}
                    {item.briefing?.gancho && (
                      <p className="mt-1 text-sm">
                        <span className="font-medium text-foreground/70">Gancho: </span>
                        {item.briefing.gancho}
                      </p>
                    )}
                    {item.motivo_descarte && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        Motivo do descarte: {item.motivo_descarte}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2 sm:min-w-[210px] sm:justify-end">
                    {item.estado === "ideia" && !item.briefing && (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={ocupado === item.id}
                        onClick={() =>
                          agir(item.id, `/conteudo/briefing?org=${org}`, {
                            method: "POST",
                            body: JSON.stringify({ sinal_id: item.sinal_id }),
                          })
                        }
                      >
                        Gerar briefing
                      </Button>
                    )}
                    {item.estado === "ideia" && item.briefing && (
                      <Button
                        size="sm"
                        className="min-w-[132px]"
                        disabled={ocupado === item.id}
                        onClick={() => agir(item.id, `/conteudo/fila/${item.id}/gerar?org=${org}`, {
                          method: "POST",
                          body: JSON.stringify({}),
                        })}
                      >
                        {ocupado === item.id ? "Gerando…" : "Gerar carrossel"}
                      </Button>
                    )}
                    {item.estado === "rascunho" && (
                      <>
                        <Button
                          size="sm"
                          className="min-w-[132px]"
                          disabled={ocupado === item.id}
                          onClick={() =>
                            agir(item.id, `/conteudo/fila/${item.id}?org=${org}`, {
                              method: "PATCH",
                              body: JSON.stringify({ estado: "aprovado" }),
                            })
                          }
                        >
                          Aprovar
                        </Button>
                        {item.carrossel_id && (
                          <Link href={`/carrossel/${item.carrossel_id}`}>
                            <Button size="sm" variant="outline">
                              Abrir no editor
                            </Button>
                          </Link>
                        )}
                      </>
                    )}
                    {item.estado === "aprovado" && (
                      <>
                        <label className="flex items-center gap-2 text-xs text-foreground/70">
                          Publicar em
                          <Input
                            type="date"
                            aria-label="Data de publicação"
                            value={item.agendado_para ?? ""}
                            min={hoje}
                            className="h-9 w-[140px]"
                            onChange={(e) =>
                              agir(item.id, `/conteudo/fila/${item.id}?org=${org}`, {
                                method: "PATCH",
                                body: JSON.stringify({ estado: "aprovado", agendado_para: e.target.value }),
                              })
                            }
                          />
                        </label>
                        <Button
                          size="sm"
                          className="min-w-[132px]"
                          disabled={ocupado === item.id}
                          onClick={() => setConfirmandoPublicar(item.id)}
                        >
                          Marcar publicado
                        </Button>
                      </>
                    )}
                    {["ideia", "rascunho", "aprovado"].includes(item.estado) && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive hover:bg-destructive/10"
                        onClick={() => {
                          setDescartando(item.id);
                          setMotivo("");
                        }}
                      >
                        Descartar
                      </Button>
                    )}
                  </div>
                </div>

                {confirmandoPublicar === item.id && (
                  <div className="mt-3 rounded-lg border border-amber-300 bg-amber-50 p-3">
                    <p className="text-xs text-amber-900">
                      Marcar como publicado não desfaz: o item sai da fila e o histórico não volta.
                      Confirma que o carrossel já está no ar?
                    </p>
                    <div className="mt-2 flex gap-2">
                      <Button
                        size="sm"
                        disabled={ocupado === item.id}
                        onClick={async () => {
                          const ok = await agir(item.id, `/conteudo/fila/${item.id}?org=${org}`, {
                            method: "PATCH",
                            body: JSON.stringify({ estado: "publicado" }),
                          });
                          if (ok) setConfirmandoPublicar(null);
                        }}
                      >
                        Sim, está publicado
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setConfirmandoPublicar(null)}>
                        Cancelar
                      </Button>
                    </div>
                  </div>
                )}

                {descartando === item.id && (
                  <div className="mt-3 rounded-lg border border-destructive/40 bg-destructive/5 p-3">
                    <label htmlFor={`motivo-${item.id}`} className="text-xs font-medium">
                      Por que está descartando? O motivo alimenta a próxima pontuação.
                    </label>
                    <Input
                      id={`motivo-${item.id}`}
                      value={motivo}
                      onChange={(e) => setMotivo(e.target.value)}
                      placeholder="fora do nicho, pauta sensível, já fizemos…"
                      className="mt-1"
                    />
                    <div className="mt-2 flex gap-2">
                      <Button
                        size="sm"
                        variant="destructive"
                        disabled={ocupado === item.id || motivo.trim().length < 3}
                        onClick={async () => {
                          const ok = await agir(item.id, `/conteudo/fila/${item.id}?org=${org}`, {
                            method: "PATCH",
                            body: JSON.stringify({ estado: "descartado", motivo }),
                          });
                          if (ok) setDescartando(null);
                        }}
                      >
                        Descartar
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setDescartando(null)}>
                        Cancelar
                      </Button>
                    </div>
                  </div>
                )}
              </article>
            ))
          )}
        </section>

        {/* Referência de performance: mede o que funciona, não copia. */}
        <section className="rounded-xl border bg-card p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold">Referência de performance</h2>
              <p className="text-xs text-muted-foreground">
                Coleta posts de Instagram e TikTok do nicho, mede engajamento e extrai o padrão de
                escrita. O padrão entra no briefing; o conteúdo de ninguém é reaproveitado.
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={ocupado === "ref-coletar"}
                onClick={() =>
                  agir("ref-coletar", `/conteudo/referencias/coletar?org=${org}`, {
                    method: "POST",
                    body: JSON.stringify({ limite: 8 }),
                  })
                }
              >
                {ocupado === "ref-coletar" ? "Coletando…" : "Coletar referências"}
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={ocupado === "ref-modelar"}
                onClick={() =>
                  agir("ref-modelar", `/conteudo/padrao/modelar?org=${org}`, {
                    method: "POST",
                    body: JSON.stringify({}),
                  })
                }
              >
                {ocupado === "ref-modelar" ? "Modelando…" : "Modelar padrão"}
              </Button>
            </div>
          </div>
          {padrao ? (
            <div className="mt-3 space-y-2">
              <p className="text-sm">{padrao.resumo}</p>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-foreground/70">
                <span>{padrao.amostra} posts medidos</span>
                <span>
                  atualizado em {new Date(padrao.gerado_em).toLocaleDateString("pt-BR")}
                </span>
                {padrao.estrutura?.densidade_texto && (
                  <span>densidade: {padrao.estrutura.densidade_texto}</span>
                )}
              </div>
              {padrao.estrutura?.gancho?.padrao && (
                <p className="text-sm">
                  <span className="font-medium text-foreground/70">Gancho que funciona: </span>
                  {padrao.estrutura.gancho.padrao}
                </p>
              )}
              {Array.isArray(padrao.estrutura?.evitar) && padrao.estrutura.evitar.length > 0 && (
                <p className="text-xs text-foreground/70">
                  Evitar: {padrao.estrutura.evitar.slice(0, 4).join("; ")}
                </p>
              )}
            </div>
          ) : (
            <p className="mt-3 text-sm text-muted-foreground">
              Nenhum padrão medido ainda. Colete referências e depois modele.
            </p>
          )}
        </section>

        {/* Sinais brutos: o que a coleta trouxe e ainda não virou pauta. */}
        <section className="rounded-xl border bg-card p-4">
          <h2 className="text-sm font-semibold">Sinais coletados</h2>
          <p className="text-xs text-muted-foreground mb-3">
            Últimos 7 dias, ordenados por nota. Sinal sem pauta é sinal que a fila ainda não usou.
          </p>
          {sinais.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum sinal na janela.</p>
          ) : (
            <ul className="space-y-2">
              {sinais.slice(0, 10).map((s) => (
                <li key={s.id} className="flex items-start justify-between gap-3 border-b pb-2 last:border-0">
                  <div className="min-w-0">
                    <a
                      href={s.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sm hover:underline line-clamp-2"
                    >
                      {s.titulo}
                    </a>
                    <span className="text-xs text-muted-foreground">
                      {s.origem} · nota {nota(s.pontuacao)}
                      {s.na_fila ? " · já na fila" : ""}
                    </span>
                  </div>
                  {!s.na_fila && (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={ocupado === s.id}
                      onClick={() =>
                        agir(s.id, `/conteudo/briefing?org=${org}`, {
                          method: "POST",
                          body: JSON.stringify({ sinal_id: s.id }),
                        })
                      }
                    >
                      Virar pauta
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Métricas por fonte: fonte que só gera descarte não merece continuar. */}
        <section className="rounded-xl border bg-card p-4">
          <h2 className="text-sm font-semibold">Qualidade por fonte</h2>
          <p className="text-xs text-muted-foreground mb-3">
            Taxa de aprovação sobre o que já foi decidido. Abaixo de 30% com pelo menos 5 decisões
            fica marcada para revisão.
          </p>
          {fontes.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sem decisões registradas ainda.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-muted-foreground">
                  <th className="py-1">Fonte</th>
                  <th className="py-1">Itens</th>
                  <th className="py-1">Aprovados</th>
                  <th className="py-1">Descartados</th>
                  <th className="py-1">Taxa</th>
                </tr>
              </thead>
              <tbody>
                {fontes.map((f) => (
                  <tr key={f.origem} className="border-t">
                    <td className="py-1.5 pr-2">
                      {f.origem}
                      {f.revisar && (
                        <span className="ml-2 rounded border border-amber-300 bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-amber-800">
                          revisar
                        </span>
                      )}
                    </td>
                    <td className="py-1.5">{f.itens}</td>
                    <td className="py-1.5">{f.aprovados}</td>
                    <td className="py-1.5">{f.descartados}</td>
                    <td className="py-1.5">
                      {f.taxa_aprovacao === null
                        ? "sem decisão"
                        : `${f.taxa_aprovacao.toFixed(1).replace(".", ",")}%`}
                      {!f.amostra_suficiente && f.taxa_aprovacao !== null && (
                        <span className="ml-1 text-xs text-muted-foreground">(amostra pequena)</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        {/* Calendário editorial: o que está aprovado, por dia. */}
        <section className="rounded-xl border bg-card p-4">
          <h2 className="text-sm font-semibold">Semana editorial</h2>
          <p className="text-xs text-muted-foreground mb-3">
            Só aparece o que tem data. Aprovar sem data é aprovar sem compromisso.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-7 gap-2">
            {semana.map((dia) => {
              const itens = calendario.filter((c) => c.agendado_para === dia);
              return (
                <div key={dia} className="rounded-lg border p-2 min-h-[86px]">
                  <p className="text-[11px] text-muted-foreground">
                    {new Date(`${dia}T12:00:00`).toLocaleDateString("pt-BR", {
                      weekday: "short",
                      day: "2-digit",
                    })}
                  </p>
                  {itens.length === 0 ? (
                    <p className="text-[11px] text-muted-foreground/70 mt-1">—</p>
                  ) : (
                    itens.map((i) => (
                      <p key={i.id} className="text-[11px] leading-tight mt-1 line-clamp-3">
                        {i.titulo}
                      </p>
                    ))
                  )}
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </main>
  );
}
