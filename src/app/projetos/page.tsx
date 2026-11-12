"use client";

/**
 * Galeria de carrosséis — direção A (Neutro denso).
 *
 * O que muda em relação à versão anterior e por quê:
 *   - grid de 3 colunas com card horizontal (antes: 2 colunas de card vertical).
 *     A tarefa aqui é varredura: 6 carrosséis na primeira tela em 1280;
 *   - busca por título e filtros de estado com contagem, funcionando de verdade
 *     (filtram a lista carregada, no cliente);
 *   - metadados em uma linha só (`v4 · 7 slides · há 2 h`) e etiqueta de estado
 *     com autor abaixo. Antes eram três linhas de texto cinza;
 *   - as ações continuam todas: abrir, duplicar, histórico, link público e
 *     excluir — só que no rodapé do card, em 28 px, sem competir com o título.
 *
 * A API continua sendo a fonte: nada de otimista aqui. Duplicar, revogar link e
 * excluir recarregam a lista depois da resposta do servidor.
 */
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Search } from "lucide-react";

import {
  apiJson,
  apiFetch,
  garantirSessao,
  sair,
  usuarioAtual,
  type UsuarioCarrossel,
} from "@/lib/auth/sessao";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  CartaoProjeto,
  quandoRelativo,
  type ProjetoGaleria,
} from "@/components/galeria/cartao-projeto";

interface Versao {
  id: string;
  versao: number;
  titulo: string | null;
  motivo: string;
  autor_email: string | null;
  criado_em: string;
  caracteres: number;
}

const CHAVE_RASCUNHO = "documentFormKey";

type Filtro = "todos" | "meus" | "link" | "sem-link";

const FILTROS: { chave: Filtro; rotulo: string }[] = [
  { chave: "todos", rotulo: "Todos" },
  { chave: "meus", rotulo: "Meus" },
  { chave: "link", rotulo: "Link ativo" },
  { chave: "sem-link", rotulo: "Sem link" },
];

function iniciais(nome: string): string {
  const partes = nome.trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return "—";
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
}

export default function ProjetosPage() {
  const router = useRouter();
  const [carregando, setCarregando] = useState(true);
  const [usuario, setUsuario] = useState<UsuarioCarrossel | null>(null);
  const [projetos, setProjetos] = useState<ProjetoGaleria[]>([]);
  const [erro, setErro] = useState<string | null>(null);
  const [acao, setAcao] = useState<string | null>(null);
  const [tituloNovo, setTituloNovo] = useState("");
  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState<Filtro>("todos");
  const [historico, setHistorico] = useState<{ projeto: ProjetoGaleria; versoes: Versao[] } | null>(
    null,
  );
  const [rascunhoLocal, setRascunhoLocal] = useState<string | null>(null);
  const [confirmandoLink, setConfirmandoLink] = useState<string | null>(null);
  const [excluindo, setExcluindo] = useState<string | null>(null);

  async function carregar() {
    const lista = await apiJson<{ projetos: ProjetoGaleria[] }>(
      "/carrossel/projetos?org=autoclinic",
    ).catch((e) => {
      setErro(e instanceof Error ? e.message : "Falha ao carregar");
      return { projetos: [] as ProjetoGaleria[] };
    });
    setProjetos(lista.projetos ?? []);
  }

  useEffect(() => {
    (async () => {
      const ok = await garantirSessao();
      if (!ok) {
        router.replace("/login?de=/projetos");
        return;
      }
      setUsuario(usuarioAtual());
      await carregar();
      // Rascunho antigo do navegador: oferece importar uma vez (K5.9).
      const bruto = localStorage.getItem(CHAVE_RASCUNHO);
      if (bruto && bruto.length > 40) setRascunhoLocal(bruto);
      setCarregando(false);
    })();
  }, [router]);

  async function novo() {
    const titulo = tituloNovo.trim() || "Sem título";
    setAcao("novo");
    setErro(null);
    try {
      const r = await apiJson<{ id: string }>("/carrossel/projetos?org=autoclinic", {
        method: "POST",
        body: JSON.stringify({ titulo }),
      });
      router.push(`/?projeto=${r.id}`);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Falha ao criar");
    } finally {
      setAcao(null);
    }
  }

  async function importarRascunho() {
    if (!rascunhoLocal) return;
    setAcao("importar");
    setErro(null);
    try {
      const documento = JSON.parse(rascunhoLocal);
      const r = await apiJson<{ id: string }>("/carrossel/projetos?org=autoclinic", {
        method: "POST",
        body: JSON.stringify({ titulo: "Rascunho importado do navegador", documento }),
      });
      // Remove só depois de o servidor confirmar: perder o rascunho por falha de
      // rede seria o pior desfecho possível desta migração.
      localStorage.removeItem(CHAVE_RASCUNHO);
      setRascunhoLocal(null);
      router.push(`/?projeto=${r.id}`);
    } catch (e) {
      setErro(e instanceof Error ? `Não foi possível importar: ${e.message}` : "Falha ao importar");
    } finally {
      setAcao(null);
    }
  }

  async function duplicar(id: string) {
    setAcao(`dup-${id}`);
    setErro(null);
    try {
      await apiJson(`/carrossel/projetos/${id}/duplicar?org=autoclinic`, { method: "POST" });
      await carregar();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Falha ao duplicar");
    } finally {
      setAcao(null);
    }
  }

  async function alternarLink(p: ProjetoGaleria) {
    setAcao(`link-${p.id}`);
    setErro(null);
    try {
      if (p.publico_ativo) {
        await apiJson(`/carrossel/projetos/${p.id}/publicar?org=autoclinic`, { method: "DELETE" });
      } else {
        const r = await apiJson<{ token: string }>(
          `/carrossel/projetos/${p.id}/publicar?org=autoclinic`,
          { method: "POST" },
        );
        const url = `${window.location.origin}/p/${r.token}`;
        await navigator.clipboard.writeText(url).catch(() => undefined);
      }
      await carregar();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Falha no link público");
    } finally {
      setAcao(null);
    }
  }

  async function excluir(p: ProjetoGaleria) {
    setAcao(`del-${p.id}`);
    setErro(null);
    try {
      const res = await apiFetch(`/carrossel/projetos/${p.id}?org=autoclinic`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const corpo = (await res.json().catch(() => ({}))) as { erro?: string };
        throw new Error(corpo.erro ?? `Erro ${res.status}`);
      }
      setExcluindo(null);
      await carregar();
    } catch (e) {
      setErro((e as Error).message);
    } finally {
      setAcao(null);
    }
  }

  async function abrirHistorico(p: ProjetoGaleria) {
    const r = await apiJson<{ versoes: Versao[] }>(
      `/carrossel/projetos/${p.id}/versoes?org=autoclinic`,
    ).catch(() => ({ versoes: [] as Versao[] }));
    setHistorico({ projeto: p, versoes: r.versoes ?? [] });
  }

  async function restaurar(projetoId: string, versaoId: string) {
    setAcao("restaurar");
    try {
      await apiJson(`/carrossel/projetos/${projetoId}/restaurar?org=autoclinic`, {
        method: "POST",
        body: JSON.stringify({ versao_id: versaoId }),
      });
      setHistorico(null);
      await carregar();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Falha ao restaurar");
    } finally {
      setAcao(null);
    }
  }

  const contagem = useMemo(
    () => ({
      todos: projetos.length,
      meus: projetos.filter((p) => p.autor_email && p.autor_email === usuario?.email).length,
      link: projetos.filter((p) => p.publico_ativo).length,
      "sem-link": projetos.filter((p) => !p.publico_ativo).length,
    }),
    [projetos, usuario],
  );

  const visiveis = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return projetos.filter((p) => {
      if (termo && !p.titulo.toLowerCase().includes(termo)) return false;
      if (filtro === "meus") return Boolean(p.autor_email && p.autor_email === usuario?.email);
      if (filtro === "link") return p.publico_ativo;
      if (filtro === "sem-link") return !p.publico_ativo;
      return true;
    });
  }, [projetos, busca, filtro, usuario]);

  if (carregando) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <p className="text-body text-muted-foreground">Carregando…</p>
      </main>
    );
  }

  const nome = usuario?.nome ?? usuario?.email ?? "";

  return (
    <main className="flex min-h-screen flex-col bg-background">
      <header className="border-b border-border">
        <div className="flex h-12 items-center gap-2 px-3 md:px-page">
          <Link href="/projetos" className="flex items-center gap-2 text-body font-semibold tracking-[-0.01em]">
            <span
              aria-hidden="true"
              className="grid size-[22px] place-items-center rounded-sm bg-primary text-primary-foreground"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="size-[13px]"
              >
                <rect x="4" y="4" width="16" height="16" rx="4.5" />
                <path d="M9.4 15.2V8.8l5.2 6.4V8.8" />
              </svg>
            </span>
            <span className="hidden sm:inline">Carrossel</span>
          </Link>

          <div className="ml-auto flex items-center gap-1">
            <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
              <Link href="/fila">Fila de conteúdo</Link>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                sair();
                router.replace("/login");
              }}
            >
              Sair
            </Button>
            <span
              aria-hidden="true"
              className="ml-1 grid size-[26px] place-items-center rounded-pill bg-primary text-[10px] font-bold text-primary-foreground"
            >
              {iniciais(nome)}
            </span>
          </div>
        </div>
      </header>

      <div className="px-3 pb-4 pt-4 md:px-page md:pt-[18px]">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-page-title font-semibold text-foreground">Carrosséis</h1>
            <p className="mt-1.5 text-body text-subtle">
              <span className="tabular-nums">{contagem.todos}</span> na organização ·{" "}
              <span className="tabular-nums">{contagem.link}</span> com link ativo
            </p>
          </div>

          <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
            <div className="relative min-w-0 flex-1 sm:flex-none">
              <Search
                aria-hidden="true"
                className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              />
              <Input
                id="busca-projetos"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar por título"
                aria-label="Buscar por título"
                className="w-full pl-8 sm:w-[210px]"
              />
            </div>
            <Input
              id="titulo-novo"
              value={tituloNovo}
              onChange={(e) => setTituloNovo(e.target.value)}
              placeholder="Título do novo carrossel"
              aria-label="Título do novo carrossel"
              className="w-full sm:w-56"
            />
            <Button onClick={novo} disabled={acao === "novo"} className="w-full sm:w-auto">
              {acao === "novo" ? "Criando…" : "Novo carrossel"}
            </Button>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-1.5" role="group" aria-label="Filtrar carrosséis">
          {FILTROS.map((f) => {
            const ativo = filtro === f.chave;
            return (
              <button
                key={f.chave}
                type="button"
                onClick={() => setFiltro(f.chave)}
                aria-pressed={ativo}
                className={
                  "inline-flex h-11 items-center gap-1.5 rounded-pill border px-3 text-meta transition-colors md:h-7 " +
                  (ativo
                    ? "border-foreground bg-foreground font-medium text-background"
                    : "border-input bg-background text-subtle hover:bg-secondary")
                }
              >
                {f.rotulo}
                <span className="tabular-nums opacity-70">{contagem[f.chave]}</span>
              </button>
            );
          })}
        </div>
      </div>

      {erro && (
        <p
          role="alert"
          className="mx-3 mb-3 rounded-md bg-destructive/10 px-3 py-2 text-meta text-destructive md:mx-page"
        >
          {erro}
        </p>
      )}

      {rascunhoLocal && (
        <div className="mx-3 mb-3 rounded-md border border-amber-500/40 bg-amber-500/10 p-3 md:mx-page">
          <p className="text-body text-foreground">
            Existe um rascunho salvo neste navegador pelo editor antigo. Importar uma vez para a
            conta?
          </p>
          <div className="mt-2 flex gap-2">
            <Button size="sm" onClick={importarRascunho} disabled={acao === "importar"}>
              {acao === "importar" ? "Importando…" : "Importar rascunho"}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                localStorage.removeItem(CHAVE_RASCUNHO);
                setRascunhoLocal(null);
              }}
            >
              Descartar
            </Button>
          </div>
        </div>
      )}

      <div className="px-3 md:px-page">
        {projetos.length === 0 ? (
          <div className="rounded-lg border border-dashed border-input p-10 text-center">
            <p className="text-body text-muted-foreground">
              Nenhum carrossel ainda. Dê um título acima e crie o primeiro.
            </p>
          </div>
        ) : visiveis.length === 0 ? (
          <div className="rounded-lg border border-dashed border-input p-10 text-center">
            <p className="text-body text-muted-foreground">
              Nenhum carrossel com esse filtro.{" "}
              <button
                type="button"
                className="font-medium text-primary underline underline-offset-2"
                onClick={() => {
                  setBusca("");
                  setFiltro("todos");
                }}
              >
                Limpar filtros
              </button>
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-1.5 md:grid-cols-2 md:gap-3 xl:grid-cols-3">
            {visiveis.map((p) => (
              <CartaoProjeto
                key={p.id}
                projeto={p}
                ocupado={acao === `dup-${p.id}` || acao === `link-${p.id}` || acao === `del-${p.id}`}
                confirmandoLink={confirmandoLink === p.id}
                excluindo={excluindo === p.id}
                onDuplicar={() => duplicar(p.id)}
                onHistorico={() => abrirHistorico(p)}
                onAlternarLink={() => alternarLink(p)}
                onConfirmarLink={() =>
                  setConfirmandoLink((atual) => (atual === p.id ? null : p.id))
                }
                onPedirExclusao={() => setExcluindo((atual) => (atual === p.id ? null : p.id))}
                onExcluir={() => excluir(p)}
                onCancelar={() => {
                  setConfirmandoLink(null);
                  setExcluindo(null);
                }}
              />
            ))}
          </div>
        )}
      </div>

      <footer className="mt-auto flex flex-wrap items-center justify-between gap-3 border-t border-border px-3 py-3 text-meta text-muted-foreground md:px-page">
        <span>
          {nome || "Sessão"} · AutoClinic
        </span>
        <Link href="/fila" className="font-semibold text-primary hover:underline">
          Abrir fila de conteúdo
        </Link>
      </footer>

      <Dialog open={Boolean(historico)} onOpenChange={(aberto) => !aberto && setHistorico(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Histórico — {historico?.projeto.titulo}</DialogTitle>
          </DialogHeader>
          <div className="max-h-80 space-y-2 overflow-y-auto">
            {(historico?.versoes ?? []).map((v) => (
              <div key={v.id} className="rounded-md border border-border p-3 text-body">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold tabular-nums">v{v.versao}</span>
                  <span className="text-meta text-muted-foreground">
                    {quandoRelativo(v.criado_em)}
                  </span>
                </div>
                <div className="text-meta text-muted-foreground">
                  {v.motivo} · {v.autor_email ?? "—"}
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-2"
                  disabled={acao === "restaurar"}
                  onClick={() => historico && restaurar(historico.projeto.id, v.id)}
                >
                  Restaurar esta versão
                </Button>
              </div>
            ))}
            {(historico?.versoes ?? []).length === 0 && (
              <p className="text-body text-muted-foreground">Sem versões registradas.</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </main>
  );
}
