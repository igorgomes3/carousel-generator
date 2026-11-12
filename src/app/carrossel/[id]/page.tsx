"use client";

/**
 * `/carrossel/<id>` — a ficha do carrossel.
 *
 * Esta tela existe na fase 1 por uma razão de rota, não por escopo novo: o
 * critério 3 da §8.1 manda `/?projeto=<id>` responder `301` para cá, e o
 * critério 4 varre esta rota atrás da palavra "projeto". Deixar um `404` depois
 * de um `301` trocaria um link quebrado por outro.
 *
 * O que ela é hoje: identificação da peça (capa do slide 1, título, estado,
 * densidade, link público) e um caminho para o editor. O que ela NÃO é: a tela
 * de aprovação da §3 (palco, filmstrip, rail, aprovar/rejeitar, ZIP por slide,
 * histórico de versões) — isso é a fase 2, que tem critérios próprios. Prometer
 * "aprovar" aqui e entregar um clique que não faz nada seria o tipo de meia
 * entrega que a fase evita.
 */
import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, ExternalLink, Loader2, Pencil } from "lucide-react";

import { apiJson, garantirSessao } from "@/lib/auth/sessao";
import { NavPrincipal } from "@/components/carrosseis/nav-principal";
import { Button } from "@/components/ui/button";
import { EtiquetaEstado } from "@/components/ui/etiqueta-estado";
import {
  coresDaCapa,
  linhaDeDensidade,
  resumoDaPeca,
  rotuloEstado,
  textoResumoDaPeca,
  tituloDaCapa,
  quandoRelativo,
  type Carrossel,
} from "@/lib/carrosseis/lista";

const ORG = "org=autoclinic";

export default function PaginaDoCarrossel() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = typeof params?.id === "string" ? params.id : "";

  const [carrossel, setCarrossel] = useState<Carrossel | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    let cancelado = false;
    (async () => {
      const ok = await garantirSessao();
      if (!ok) {
        router.replace(`/login?de=/carrossel/${id}`);
        return;
      }
      try {
        const r = await apiJson<{ carrossel: Carrossel }>(
          `/carrossel/carrosseis/${id}?${ORG}`,
        );
        if (!cancelado) setCarrossel(r.carrossel);
      } catch (e) {
        if (!cancelado) setErro(e instanceof Error ? e.message : "Carrossel não encontrado");
      } finally {
        if (!cancelado) setCarregando(false);
      }
    })();
    return () => {
      cancelado = true;
    };
  }, [id, router]);

  const capa = carrossel ? coresDaCapa(carrossel) : null;
  const resumo = carrossel ? resumoDaPeca(carrossel) : null;

  return (
    <div className="min-h-screen bg-background">
      <NavPrincipal usuario={null} />

      <main className="mx-auto w-full max-w-[1180px] px-page pb-16 pt-page">
        <Link
          href="/"
          className="inline-flex h-11 items-center gap-1.5 rounded-sm text-control text-muted-foreground hover:text-foreground md:h-8"
        >
          <ArrowLeft className="size-3.5" aria-hidden="true" /> Carrosséis
        </Link>

        {carregando ? (
          <p className="mt-4 flex items-center gap-2 text-body text-muted-foreground">
            <Loader2 className="size-4 animate-spin" aria-hidden="true" /> Carregando carrossel…
          </p>
        ) : erro ? (
          <div
            role="alert"
            className="mt-4 rounded-md border border-[#FCA5A5] bg-[#FEF2F2] px-3 py-2 text-body text-[#B91C1C]"
          >
            {erro}
          </div>
        ) : carrossel && capa ? (
          <div className="mt-4 flex flex-col gap-4 md:flex-row md:items-start">
            <div
              aria-hidden="true"
              data-preview="1"
              style={{ backgroundColor: capa.fundo, color: capa.texto }}
              className="flex aspect-[4/5] w-[168px] shrink-0 flex-col justify-between overflow-hidden rounded-md p-2"
            >
              <span className="overflow-hidden text-[14px] font-semibold leading-[1.25] [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:5]">
                {tituloDaCapa(carrossel)}
              </span>
              <span className="text-[10px] tabular-nums opacity-70">
                1/{carrossel.capa?.slides ?? carrossel.slides ?? 1}
              </span>
            </div>

            <div className="min-w-0 flex-1">
              <h1 className="text-page-title font-semibold tracking-[-0.025em] text-foreground">
                {carrossel.titulo}
              </h1>
              <p className="mt-1 flex flex-wrap items-center gap-2 text-meta text-muted-foreground">
                <EtiquetaEstado
                  tom={carrossel.estado === "aguardando_aprovacao" ? "ativo" : "neutro"}
                >
                  {rotuloEstado(carrossel.estado)}
                </EtiquetaEstado>
                <span className="tabular-nums">{linhaDeDensidade(carrossel)}</span>
              </p>
              {resumo && (
                <p className="mt-1 text-meta tabular-nums text-muted-foreground">
                  {textoResumoDaPeca(resumo)}
                </p>
              )}
              {carrossel.pauta_titulo && (
                <p className="mt-1 truncate text-meta text-muted-foreground">
                  pauta: {carrossel.pauta_titulo}
                </p>
              )}

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Button asChild>
                  <Link href={`/carrossel/${carrossel.id}/editar`}>
                    <Pencil className="size-3.5" aria-hidden="true" /> Abrir no editor
                  </Link>
                </Button>
                {carrossel.publico_ativo && carrossel.publico_token && (
                  <Button asChild variant="outline">
                    <a
                      href={`/p/${carrossel.publico_token}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <ExternalLink className="size-3.5" aria-hidden="true" /> Ver link público
                    </a>
                  </Button>
                )}
              </div>

              <p className="mt-4 max-w-prose text-meta text-muted-foreground">
                Palco, filmstrip e o rail de aprovação (aprovar, rejeitar com motivo, baixar o
                pacote) entram na fase 2 do plano. Aqui hoje: identificar a peça e abrir no editor
                {carrossel.criado_em ? ` — criada ${quandoRelativo(carrossel.criado_em)}` : ""}.
              </p>
            </div>
          </div>
        ) : null}
      </main>
    </div>
  );
}
