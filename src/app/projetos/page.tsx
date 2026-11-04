"use client";

/**
 * Galeria de carrosséis.
 *
 * Antes o editor guardava tudo no navegador: fechar a aba perdia o trabalho e
 * ninguém conseguia ver o carrossel de outra pessoa. Aqui os projetos vêm do
 * banco, com autor, versão e link público.
 */
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
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

interface Projeto {
  id: string;
  titulo: string;
  versao_atual: number;
  publico_ativo: boolean;
  atualizado_em: string;
  slides: number;
  autor_nome: string | null;
  autor_email: string | null;
}

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

function quando(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

export default function ProjetosPage() {
  const router = useRouter();
  const [carregando, setCarregando] = useState(true);
  const [usuario, setUsuario] = useState<UsuarioCarrossel | null>(null);
  const [projetos, setProjetos] = useState<Projeto[]>([]);
  const [erro, setErro] = useState<string | null>(null);
  const [acao, setAcao] = useState<string | null>(null);
  const [tituloNovo, setTituloNovo] = useState("");
  const [historico, setHistorico] = useState<{ projeto: Projeto; versoes: Versao[] } | null>(null);
  const [rascunhoLocal, setRascunhoLocal] = useState<string | null>(null);
  const [confirmandoLink, setConfirmandoLink] = useState<string | null>(null);

  async function carregar() {
    const lista = await apiJson<{ projetos: Projeto[] }>(
      "/carrossel/projetos?org=autoclinic",
    ).catch((e) => {
      setErro(e instanceof Error ? e.message : "Falha ao carregar");
      return { projetos: [] as Projeto[] };
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

  async function alternarLink(p: Projeto) {
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

  async function abrirHistorico(p: Projeto) {
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

  if (carregando) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p className="text-sm text-muted-foreground">Carregando…</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="mx-auto max-w-5xl px-4 h-14 flex items-center justify-between">
          <Link href="/projetos" className="font-semibold tracking-tight">
            Carrossel
          </Link>
          <div className="flex items-center gap-3 text-sm">
            <span className="text-muted-foreground hidden sm:inline">
              {usuario?.nome ?? usuario?.email}
            </span>
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
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-4 py-8">
        <div className="flex flex-wrap items-end justify-between gap-3 mb-6">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Meus carrosséis</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Salvo na conta, não no navegador. Autor vê os próprios; gestor e dono veem a
              organização.{" "}
              <Link href="/fila" className="underline underline-offset-2 hover:text-foreground">
                Fila de conteúdo
              </Link>
            </p>
          </div>
          <div className="flex gap-2">
            <Input
              id="titulo-novo"
              value={tituloNovo}
              onChange={(e) => setTituloNovo(e.target.value)}
              placeholder="Título do novo carrossel"
              className="w-56"
              aria-label="Título do novo carrossel"
            />
            <label htmlFor="titulo-novo" className="sr-only">
              Título do novo carrossel
            </label>
            <Button onClick={novo} disabled={acao === "novo"}>
              {acao === "novo" ? "Criando…" : "Novo carrossel"}
            </Button>
          </div>
        </div>

        {erro && (
          <p className="text-sm rounded-lg bg-destructive/10 text-destructive px-3 py-2 mb-4">{erro}</p>
        )}

        {rascunhoLocal && (
          <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 mb-4">
            <p className="text-sm">
              Existe um rascunho salvo neste navegador pelo editor antigo. Importar uma vez para a
              conta?
            </p>
            <div className="flex gap-2 mt-3">
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

        {projetos.length === 0 ? (
          <div className="rounded-xl border border-dashed p-10 text-center">
            <p className="text-sm text-muted-foreground">
              Nenhum carrossel ainda. Dê um título acima e crie o primeiro.
            </p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {projetos.map((p) => (
              <div key={p.id} className="rounded-xl border bg-card p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-semibold truncate">{p.titulo}</div>
                    <div className="text-xs text-muted-foreground mt-1 tabular-nums">
                      v{p.versao_atual} · {p.slides} slide{p.slides === 1 ? "" : "s"} ·{" "}
                      {quando(p.atualizado_em)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {p.autor_nome ?? p.autor_email ?? "autor desconhecido"}
                    </div>
                  </div>
                  {p.publico_ativo && (
                    <span className="shrink-0 whitespace-nowrap rounded-md border border-emerald-300 bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700">
                      link ativo
                    </span>
                  )}
                </div>

                {confirmandoLink === p.id && (
                  <div className="mt-3 rounded-lg border border-destructive/40 bg-destructive/5 p-3">
                    <p className="text-xs">
                      Revogar o link de <strong>{p.titulo}</strong>? Quem tiver a URL deixa de abrir o
                      carrossel na hora, e republicar mantém a mesma URL.
                    </p>
                    <div className="flex gap-2 mt-2">
                      <Button
                        size="sm"
                        variant="destructive"
                        disabled={acao === `link-${p.id}`}
                        onClick={async () => {
                          await alternarLink(p);
                          setConfirmandoLink(null);
                        }}
                      >
                        Revogar
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setConfirmandoLink(null)}>
                        Cancelar
                      </Button>
                    </div>
                  </div>
                )}

                <div className="flex flex-wrap gap-2 mt-3">
                  <Button size="sm" asChild>
                    <Link href={`/?projeto=${p.id}`}>Abrir</Link>
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => duplicar(p.id)}
                    disabled={acao === `dup-${p.id}`}
                  >
                    Duplicar
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => abrirHistorico(p)}>
                    Histórico
                  </Button>
                  {p.publico_ativo ? (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive hover:bg-destructive/10"
                      onClick={() => setConfirmandoLink(p.id)}
                      disabled={acao === `link-${p.id}`}
                    >
                      Revogar link
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => alternarLink(p)}
                      disabled={acao === `link-${p.id}`}
                    >
                      Link público
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Dialog open={Boolean(historico)} onOpenChange={(aberto) => !aberto && setHistorico(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Histórico — {historico?.projeto.titulo}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {(historico?.versoes ?? []).map((v) => (
              <div key={v.id} className="rounded-lg border p-3 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold tabular-nums">v{v.versao}</span>
                  <span className="text-xs text-muted-foreground">{quando(v.criado_em)}</span>
                </div>
                <div className="text-xs text-muted-foreground">
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
              <p className="text-sm text-muted-foreground">Sem versões registradas.</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </main>
  );
}
