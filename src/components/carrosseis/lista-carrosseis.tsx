"use client";

/**
 * Tela inicial — Carrosséis (fase 1 do plano de UI).
 *
 * A pergunta que esta tela responde: "o que está esperando meu olho agora?".
 * Ela é a casca: as regras (abas, contagens, busca, ordem, página) vivem em
 * `@/lib/carrosseis/lista` e são testadas sem navegador; aqui só há DOM,
 * requisição e estado de seleção.
 *
 * Três decisões que estão neste arquivo e valem registro:
 *
 * 1. A URL é a fonte da verdade (`?aba=`, `?q=`, `?estado=`, `?ordem=`,
 *    `?pagina=`). Trocar de aba, buscar ou ordenar escreve na URL com
 *    `router.replace`, então voltar no navegador devolve a tela como estava e o
 *    endereço é compartilhável.
 *
 * 2. A lista é lida UMA vez por carga (`GET /carrossel/carrosseis`) e filtrada
 *    em memória. A API em `cf717c1` não aceita `?q=`, `?estado=` nem `?ordenar=`
 *    — a §2.4 pede busca no servidor e a divergência está registrada em
 *    `docs/design/fase-1-decisoes.md`. Como o teto da própria API é 200 linhas,
 *    filtrar aqui não muda o que o usuário vê; quando a API ganhar os
 *    parâmetros, só `carregar()` muda.
 *
 * 3. Skeleton só na primeira carga. Trocar de aba com a lista já em memória não
 *    pode piscar (§2.6) — por isso `carregando` só é verdadeiro quando não há
 *    nada carregado ainda.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Plus } from "lucide-react";

import {
  apiFetch,
  apiJson,
  garantirSessao,
  usuarioAtual,
  type UsuarioCarrossel,
} from "@/lib/auth/sessao";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { NavPrincipal } from "@/components/carrosseis/nav-principal";
import { CartaoCarrossel, type AcaoCartao } from "@/components/carrosseis/cartao-carrossel";
import { BarraSelecao } from "@/components/carrosseis/barra-selecao";
import {
  CampoBusca,
  ChipsAbas,
  ChipsEstados,
  SeletorOrdem,
} from "@/components/carrosseis/controles";
import {
  EsqueletoLista,
  FaixaErro,
  VazioAba,
  VazioBusca,
  VazioOrganizacao,
} from "@/components/carrosseis/estados";
import {
  ABA_PADRAO,
  ORDEM_PADRAO,
  aplicarParametros,
  contagensPorAba,
  buscar,
  definicaoDaAba,
  ehAba,
  ehEstado,
  ehOrdem,
  type Aba,
  type Carrossel,
  type Estado,
  type Ordem,
} from "@/lib/carrosseis/lista";
import { getDefaultSlideOfType } from "@/lib/default-slides";
import { defaultValues } from "@/lib/default-document";
import { SlideType } from "@/lib/validation/slide-schema";

const ORG = "org=autoclinic";
const ESPERA_BUSCA = 300;

interface Versao {
  id: string;
  versao: number;
  titulo: string | null;
  motivo: string;
  autor_email: string | null;
  criado_em: string;
  caracteres: number;
}

/** Documento de um carrossel em branco: um slide, sem conteúdo (§1.4). */
function documentoEmBranco() {
  return {
    ...defaultValues,
    slides: [getDefaultSlideOfType(SlideType.enum.Intro)],
  };
}

export function ListaCarrosseis({ estadosDevLiberados }: { estadosDevLiberados: boolean }) {
  const router = useRouter();
  const params = useSearchParams();

  const [usuario, setUsuario] = useState<UsuarioCarrossel | null>(null);
  const [lista, setLista] = useState<Carrossel[] | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);

  const [selecionados, setSelecionados] = useState<string[]>([]);
  const [confirmandoExclusao, setConfirmandoExclusao] = useState<string[] | null>(null);
  const [pedindoData, setPedindoData] = useState(false);
  const [dataPublicacao, setDataPublicacao] = useState(() => new Date().toISOString().slice(0, 10));
  const [historicoDe, setHistoricoDe] = useState<Carrossel | null>(null);
  const [versoes, setVersoes] = useState<Versao[]>([]);

  /** Texto do campo de busca: o input responde na hora, a URL depois de 300 ms. */
  const [textoBusca, setTextoBusca] = useState(params.get("q") ?? "");
  const relogioBusca = useRef<ReturnType<typeof setTimeout> | null>(null);

  // --- leitura da URL ------------------------------------------------------
  const abaUrl = params.get("aba");
  const aba: Aba = ehAba(abaUrl) ? abaUrl : ABA_PADRAO;
  const estadoUrl = params.get("estado");
  const estadoExato: Estado | null = ehEstado(estadoUrl) ? estadoUrl : null;
  const estadoDev =
    estadosDevLiberados && (estadoUrl === "vazio" || estadoUrl === "carregando" || estadoUrl === "erro")
      ? estadoUrl
      : null;
  const ordemUrl = params.get("ordem");
  const ordem: Ordem = ehOrdem(ordemUrl) ? ordemUrl : ORDEM_PADRAO;
  const q = params.get("q") ?? "";
  const paginaUrl = Number(params.get("pagina") ?? 1);
  const fonte = params.get("fonte");
  const de = params.get("de");
  const ate = params.get("ate");

  /** Escreve na URL trocando só o que mudou; preserva o resto (q, ordem, aba). */
  const escrever = useCallback(
    (mudancas: Record<string, string | null>) => {
      const proximo = new URLSearchParams(params.toString());
      for (const [chave, valor] of Object.entries(mudancas)) {
        if (valor === null || valor === "") proximo.delete(chave);
        else proximo.set(chave, valor);
      }
      const query = proximo.toString();
      router.replace(query ? `/?${query}` : "/", { scroll: false });
    },
    [params, router],
  );

  // --- carga ---------------------------------------------------------------
  const carregar = useCallback(async () => {
    setErro(null);
    try {
      const r = await apiJson<{ carrosseis: Carrossel[] }>(`/carrossel/carrosseis?${ORG}`);
      setLista(r.carrosseis ?? []);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Falha ao carregar os carrosséis");
      // O grid anterior NÃO é limpo (§2.6): `lista` fica como está.
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    (async () => {
      const ok = await garantirSessao();
      if (!ok) {
        router.replace("/login?de=/");
        return;
      }
      setUsuario(usuarioAtual());
      await carregar();
    })();
  }, [carregar, router]);

  useEffect(() => {
    setTextoBusca(q);
  }, [q]);

  useEffect(() => {
    return () => {
      if (relogioBusca.current) clearTimeout(relogioBusca.current);
    };
  }, []);

  function buscarComEspera(valor: string) {
    setTextoBusca(valor);
    if (relogioBusca.current) clearTimeout(relogioBusca.current);
    relogioBusca.current = setTimeout(() => {
      escrever({ q: valor.trim() || null, pagina: null });
    }, ESPERA_BUSCA);
  }

  // --- derivação -----------------------------------------------------------
  const resultado = useMemo(() => {
    const base = lista ?? [];
    return aplicarParametros(base, {
      aba,
      q,
      estado: estadoExato,
      ordem,
      fonte,
      de,
      ate,
      pagina: Number.isFinite(paginaUrl) ? paginaUrl : 1,
    });
  }, [lista, aba, q, estadoExato, ordem, fonte, de, ate, paginaUrl]);

  /** Contagens dos chips considerando a busca ativa (§2.4: contagem da aba vista). */
  const contagensDaBusca = useMemo(() => {
    if (!q) return null;
    return contagensPorAba(buscar(lista ?? [], q));
  }, [lista, q]);

  // --- ações de um cartão --------------------------------------------------
  async function chamar(caminho: string, init: RequestInit) {
    const res = await apiFetch(caminho, init);
    const corpo = (await res.json().catch(() => ({}))) as { erro?: string };
    if (!res.ok) {
      if (res.status === 404 || res.status === 405) {
        throw new Error(
          `A API do AutoClinic não tem essa rota ainda (${caminho.split("?")[0]}, HTTP ${res.status}). ` +
            (corpo.erro ?? ""),
        );
      }
      throw new Error(corpo.erro ?? `Erro ${res.status}`);
    }
    return corpo;
  }

  async function aoAcionar(acao: AcaoCartao, carrossel: Carrossel) {
    setErro(null);
    setAviso(null);
    try {
      if (acao === "duplicar") {
        setOcupado(true);
        const r = (await chamar(`/carrossel/carrosseis/${carrossel.id}/duplicar?${ORG}`, {
          method: "POST",
        })) as { id?: string };
        await carregar();
        setAviso(`Cópia criada${r.id ? "" : ""}.`);
        return;
      }
      if (acao === "historico") {
        setHistoricoDe(carrossel);
        setVersoes([]);
        const r = await apiJson<{ versoes: Versao[] }>(
          `/carrossel/carrosseis/${carrossel.id}/versoes?${ORG}`,
        );
        setVersoes(r.versoes ?? []);
        return;
      }
      if (acao === "link") {
        setOcupado(true);
        if (carrossel.publico_ativo) {
          await chamar(`/carrossel/carrosseis/${carrossel.id}/publicar?${ORG}`, { method: "DELETE" });
          setAviso("Link público revogado. Quem tinha a URL deixa de abrir.");
        } else {
          const r = (await chamar(`/carrossel/carrosseis/${carrossel.id}/publicar?${ORG}`, {
            method: "POST",
          })) as { token?: string; url?: string };
          const token = r.token ?? carrossel.publico_token;
          if (token) {
            const url = `${window.location.origin}/p/${token}`;
            await navigator.clipboard?.writeText(url).catch(() => undefined);
            setAviso(`Link público criado e copiado: ${url}`);
          } else {
            setAviso("Link público criado.");
          }
        }
        await carregar();
        return;
      }
      if (acao === "excluir") {
        setConfirmandoExclusao([carrossel.id]);
      }
      if (acao === "gerar") {
        setOcupado(true);
        try {
          // §2.3: a ação primária de `a_produzir` é `Gerar`. O teto diário
          // (`max_por_dia`) é quem responde 409, e a mensagem do servidor é o
          // que a faixa mostra — sem inventar texto local para um erro de
          // política do servidor.
          const r = await chamar(`/carrossel/carrosseis/${carrossel.id}/gerar?${ORG}`, {
            method: "POST",
          });
          await carregar();
          setAviso((r as { mensagem?: string }).mensagem ?? "Geração iniciada.");
        } catch (e) {
          setErro(e instanceof Error ? e.message : "A geração falhou");
        } finally {
          setOcupado(false);
        }
      }
    } catch (e) {
      setErro(e instanceof Error ? e.message : "A ação falhou");
    } finally {
      setOcupado(false);
    }
  }

  // --- ações em lote (§2.5) ------------------------------------------------
  async function excluirEmLote(ids: string[]) {
    setOcupado(true);
    setErro(null);
    try {
      for (const id of ids) {
        await chamar(`/carrossel/carrosseis/${id}?${ORG}`, { method: "DELETE" });
      }
      setSelecionados([]);
      setConfirmandoExclusao(null);
      await carregar();
      setAviso(`${ids.length} ${ids.length === 1 ? "carrossel excluído" : "carrosséis excluídos"}.`);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "A exclusão falhou");
      await carregar();
    } finally {
      setOcupado(false);
    }
  }

  async function aprovarEmLote() {
    setOcupado(true);
    setErro(null);
    setAviso(null);
    try {
      const r = (await chamar(`/carrossel/carrosseis/aprovar?${ORG}`, {
        method: "POST",
        body: JSON.stringify({ ids: selecionados }),
      })) as { aprovados?: string[]; ignorados?: { id: string; motivo: string }[] };
      const aprovados = r.aprovados?.length ?? 0;
      const ignorados = r.ignorados ?? [];
      setSelecionados([]);
      await carregar();
      setAviso(
        ignorados.length
          ? `${aprovados} aprovado(s). ${ignorados.length} ignorado(s): ${ignorados
              .map((i) => i.motivo)
              .join("; ")}`
          : `${aprovados} aprovado(s).`,
      );
    } catch (e) {
      setErro(e instanceof Error ? e.message : "A aprovação falhou");
    } finally {
      setOcupado(false);
    }
  }

  async function marcarPublicado() {
    setOcupado(true);
    setErro(null);
    setAviso(null);
    try {
      for (const id of selecionados) {
        await chamar(`/carrossel/carrosseis/${id}?${ORG}`, {
          method: "PATCH",
          body: JSON.stringify({ publicada_em: dataPublicacao, estado: "publicada" }),
        });
      }
      setSelecionados([]);
      setPedindoData(false);
      await carregar();
      setAviso(`${selecionados.length} marcado(s) como publicado(s) em ${dataPublicacao}.`);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível marcar como publicado");
    } finally {
      setOcupado(false);
    }
  }

  async function criarNovo() {
    setOcupado(true);
    setErro(null);
    try {
      const r = (await chamar(`/carrossel/carrosseis?${ORG}`, {
        method: "POST",
        body: JSON.stringify({ titulo: "Sem título", documento: documentoEmBranco() }),
      })) as { id?: string };
      if (r.id) router.push(`/carrossel/${r.id}/editar`);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível criar o carrossel");
    } finally {
      setOcupado(false);
    }
  }

  // --- render --------------------------------------------------------------
  const totalOrganizacao = lista?.length ?? 0;
  const vamosCarregar = estadoDev === "carregando" || (carregando && !estadoDev);
  const mostrarErro = estadoDev === "erro" ? "Falha simulada (?estado=erro)" : erro;

  const listaVazia =
    estadoDev === "vazio" || (!vamosCarregar && totalOrganizacao === 0 && !mostrarErro);

  const semResultado = !vamosCarregar && !listaVazia && resultado.filtrados.length === 0;

  return (
    <div className="min-h-screen bg-background">
      <NavPrincipal usuario={usuario} />

      <main className="mx-auto w-full max-w-[1180px] px-page pb-16 pt-page">
        {/* Cabeçalho: título + resumo de um lado, a única ação preenchida da tela. */}
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-page-title font-semibold tracking-[-0.025em] text-foreground">
              Carrosséis
            </h1>
            <p className="mt-1 text-meta tabular-nums text-muted-foreground" data-resumo="1">
              {resultado.contagens.para_aprovar} para aprovar ·{" "}
              {resultado.contagens.aprovadas} aprovadas ·{" "}
              {resultado.porEstado.publicada} publicadas
            </p>
          </div>
          <Button onClick={criarNovo} disabled={ocupado} className="w-full sm:w-auto">
            <Plus className="size-4" aria-hidden="true" />
            {ocupado ? "Criando…" : "Novo"}
          </Button>
        </div>

        {/* Controles: busca + ordenação, depois chips. Empilhados no mobile. */}
        <div className="mt-4 flex flex-col gap-2 md:flex-row md:items-center">
          <CampoBusca valor={textoBusca} onMudar={buscarComEspera} />
          <SeletorOrdem valor={ordem} onMudar={(o) => escrever({ ordem: o, pagina: null })} />
        </div>

        <div className="mt-2 flex flex-col gap-1.5">
          <ChipsAbas
            lista={lista ?? []}
            aba={aba}
            onAba={(a) => escrever({ aba: a, estado: null, pagina: null })}
            totalBusca={contagensDaBusca}
          />
          <ChipsEstados
            lista={lista ?? []}
            estado={estadoExato}
            onEstado={(e) => escrever({ estado: e, pagina: null })}
          />
        </div>

        {mostrarErro && (
          <div className="mt-3">
            <FaixaErro mensagem={mostrarErro} onTentar={carregar} />
          </div>
        )}

        {/* A barra de seleção troca o cabeçalho, não empilha em cima dele. */}
        {selecionados.length > 0 && (
          <div className="mt-3">
            <BarraSelecao
              quantidade={selecionados.length}
              total={resultado.filtrados.length}
              ocupado={ocupado}
              pedindoConfirmacao={Boolean(confirmandoExclusao)}
              pedindoData={pedindoData}
              dataPublicacao={dataPublicacao}
              onDataPublicacao={setDataPublicacao}
              onAprovar={aprovarEmLote}
              onPedirExclusao={() => setConfirmandoExclusao(selecionados)}
              onConfirmarExclusao={() => excluirEmLote(confirmandoExclusao ?? selecionados)}
              onPedirData={() => setPedindoData(true)}
              onConfirmarPublicado={marcarPublicado}
              onCancelar={() => {
                setConfirmandoExclusao(null);
                setPedindoData(false);
              }}
              onLimpar={() => setSelecionados([])}
            />
          </div>
        )}

        {aviso && (
          <div
            role="status"
            className="mt-3 rounded-md border border-border bg-secondary px-3 py-2 text-body text-subtle"
          >
            {aviso}
          </div>
        )}

        <div className="mt-3">
          {vamosCarregar ? (
            <EsqueletoLista />
          ) : listaVazia ? (
            <VazioOrganizacao onNovo={criarNovo} criando={ocupado} />
          ) : semResultado && q ? (
            <VazioBusca termo={q} onLimpar={() => escrever({ q: null, pagina: null })} />
          ) : semResultado && estadoExato ? (
            <VazioAba
              aba={definicaoDaAba(aba).rotulo}
              total={resultado.contagens.todas}
              onVerTodas={() => escrever({ estado: null, aba: "todas", pagina: null })}
            />
          ) : semResultado ? (
            <VazioAba
              aba={definicaoDaAba(aba).rotulo}
              total={resultado.contagens.todas}
              onVerTodas={() => escrever({ aba: "todas", pagina: null })}
            />
          ) : (
            <>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3" data-lista="1">
                {resultado.itens.map((c) => (
                  <CartaoCarrossel
                    key={c.id}
                    carrossel={c}
                    selecionado={selecionados.includes(c.id)}
                    ocupado={ocupado}
                    onSelecionar={(id, marcado) =>
                      setSelecionados((atual) =>
                        marcado ? Array.from(new Set([...atual, id])) : atual.filter((x) => x !== id),
                      )
                    }
                    onAcao={aoAcionar}
                  />
                ))}
              </div>

              {resultado.pagina.paginas > 1 && (
                <nav
                  aria-label="Paginação"
                  className="mt-4 flex items-center justify-between gap-2 text-meta text-muted-foreground"
                >
                  <span className="tabular-nums">{resultado.pagina.intervalo}</span>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={resultado.pagina.pagina <= 1}
                      onClick={() =>
                        escrever({ pagina: String(Math.max(1, resultado.pagina.pagina - 1)) })
                      }
                    >
                      Anterior
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={resultado.pagina.pagina >= resultado.pagina.paginas}
                      onClick={() =>
                        escrever({
                          pagina: String(Math.min(resultado.pagina.paginas, resultado.pagina.pagina + 1)),
                        })
                      }
                    >
                      Próxima
                    </Button>
                  </div>
                </nav>
              )}
            </>
          )}
        </div>
      </main>

      <Dialog open={Boolean(historicoDe)} onOpenChange={(v) => !v && setHistoricoDe(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Histórico de {historicoDe?.titulo}</DialogTitle>
          </DialogHeader>
          {versoes.length === 0 ? (
            <p className="text-body text-muted-foreground">Sem versões registradas.</p>
          ) : (
            <ul className="flex max-h-80 flex-col gap-1 overflow-auto">
              {versoes.map((v) => (
                <li
                  key={v.id}
                  className="flex items-center justify-between gap-2 border-b border-border pb-1 text-meta"
                >
                  <span className="font-semibold tabular-nums text-foreground">v{v.versao}</span>
                  <span className="min-w-0 flex-1 truncate text-muted-foreground">{v.motivo}</span>
                  <span className="tabular-nums text-muted-foreground">
                    {new Date(v.criado_em).toLocaleDateString("pt-BR")}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <div className="flex justify-end">
            <Link href={historicoDe ? `/carrossel/${historicoDe.id}` : "/"}>
              <Button size="sm" variant="ghost">
                Ver carrossel
              </Button>
            </Link>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
