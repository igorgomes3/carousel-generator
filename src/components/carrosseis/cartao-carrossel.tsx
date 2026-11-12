"use client";

/**
 * Cartão de carrossel da tela inicial — direção A (Neutro denso).
 *
 * O que a §2.2 pede e onde está aqui:
 *   capa      miniatura 4:5 de 78 px pintada com o FUNDO DO SLIDE 1 (`capa` que
 *             a API grava), não com um tom derivado do id. A capa antiga era
 *             falsa (`cartao-projeto.tsx` pintava o tom do id porque a API não
 *             devolvia o documento) e o critério 6 da §8.1 mede exatamente isso;
 *   linha 1   título em 14,5/600, duas linhas com clamp;
 *   linha 2   `7 slides · 1080×1350 · há 2 h` em 12 px tabular-nums;
 *   linha 3   etiqueta de estado + `pauta: <título do sinal>` truncada;
 *   linha 4   `legenda 312/2.200 · 8 hashtags · 2 fotos`, só quando existe;
 *   rodapé    `Abrir` (acento) + `⋯` com Duplicar, Histórico, Link público e
 *             Excluir — ações fora do caminho do título.
 *
 * Autor não aparece: usuário único (§0, item 3). Ele vira linha do histórico.
 *
 * O menu `⋯` é um botão com `aria-expanded` e uma lista `role="menu"`, e não um
 * `DropdownMenu` do Radix: o pacote não está nas dependências do projeto e
 * trazer um primitivo novo por causa de quatro itens custaria mais do que os
 * trinta e poucos eventos que este arquivo implementa (Esc, clique fora, foco).
 */
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Clock, Copy, Link2, MoreHorizontal, Trash2, Unlink } from "lucide-react";

import { Checkbox } from "@/components/ui/checkbox";
import { EtiquetaEstado } from "@/components/ui/etiqueta-estado";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  coresDaCapa,
  linhaDeDensidade,
  resumoDaPeca,
  rotuloEstado,
  textoResumoDaPeca,
  tituloDaCapa,
  type Carrossel,
} from "@/lib/carrosseis/lista";

export type AcaoCartao = "duplicar" | "historico" | "link" | "excluir" | "gerar";

export function CartaoCarrossel({
  carrossel,
  selecionado,
  ocupado,
  onSelecionar,
  onAcao,
}: {
  carrossel: Carrossel;
  selecionado: boolean;
  ocupado: boolean;
  onSelecionar: (id: string, marcado: boolean) => void;
  onAcao: (acao: AcaoCartao, carrossel: Carrossel) => void;
}) {
  const [menuAberto, setMenuAberto] = useState(false);
  const caixaMenu = useRef<HTMLDivElement | null>(null);
  const botaoMenu = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!menuAberto) return;
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMenuAberto(false);
        botaoMenu.current?.focus();
      }
    };
    const aoClicarFora = (e: MouseEvent) => {
      if (!caixaMenu.current?.contains(e.target as Node)) setMenuAberto(false);
    };
    document.addEventListener("keydown", aoTeclar);
    document.addEventListener("mousedown", aoClicarFora);
    return () => {
      document.removeEventListener("keydown", aoTeclar);
      document.removeEventListener("mousedown", aoClicarFora);
    };
  }, [menuAberto]);

  const capa = coresDaCapa(carrossel);
  const resumo = resumoDaPeca(carrossel);
  const slides = carrossel.capa?.slides ?? carrossel.slides;

  function acionar(acao: AcaoCartao) {
    setMenuAberto(false);
    onAcao(acao, carrossel);
  }

  return (
    <article
      data-carrossel={carrossel.id}
      data-estado={carrossel.estado}
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-lg border bg-card shadow-card transition-colors",
        selecionado ? "border-primary" : "border-border hover:border-input",
      )}
    >
      <div className="flex gap-3 p-card">
        {/* Capa: cor real do slide 1. `data-preview` marca prévia de conteúdo —
            ela é isenta das regras de texto de interface (7,5 px), como a
            miniatura antiga. */}
        <div
          aria-hidden="true"
          data-preview="1"
          data-capa-real={capa.real ? "1" : "0"}
          className="flex aspect-[4/5] w-thumb shrink-0 flex-col justify-between overflow-hidden rounded-sm p-1.5"
          style={{ backgroundColor: capa.fundo, color: capa.texto }}
        >
          <span className="overflow-hidden text-[7.5px] font-semibold leading-[1.25] tracking-[-0.01em] [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:4]">
            {tituloDaCapa(carrossel)}
          </span>
          <span className="flex items-center justify-between text-[6.5px] tabular-nums opacity-70">
            <span className="grid size-2.5 place-items-center rounded-pill bg-black/15 text-[5px] font-bold">
              AC
            </span>
            <span>1/{slides || 1}</span>
          </span>
        </div>

        <div className="flex min-w-0 flex-1 flex-col">
          {/* Linha 1 */}
          <h3 className="line-clamp-2 text-card-title font-semibold text-foreground">
            {carrossel.titulo}
          </h3>

          {/* Linha 2 */}
          <p className="mt-1.5 text-meta tabular-nums text-muted-foreground">
            {linhaDeDensidade({ ...carrossel, slides })}
          </p>

          {/* Linha 3: estado + pauta de origem, quando a API devolver a pauta. */}
          <p className="mt-1.5 flex min-w-0 items-center gap-2 text-meta text-muted-foreground">
            <EtiquetaEstado tom={carrossel.estado === "aguardando_aprovacao" ? "ativo" : "neutro"}>
              {rotuloEstado(carrossel.estado)}
            </EtiquetaEstado>
            {carrossel.pauta_titulo && (
              <span className="min-w-0 truncate" title={carrossel.pauta_titulo}>
                pauta: {carrossel.pauta_titulo}
              </span>
            )}
          </p>

          {/* Linha 4: só quando existe dado — "legenda 0/2.200" não informa. */}
          {resumo && (
            <p className="mt-1 text-meta tabular-nums text-muted-foreground">
              {textoResumoDaPeca(resumo)}
            </p>
          )}
        </div>
      </div>

      {/* Seleção: 16 px, visível no hover do desktop e sempre no mobile —
          esconder o alvo no toque deixaria a ação em lote inalcançável no
          celular, que é onde "long press" do plano não tem gesto padrão. O
          quadrado de toque é 44 px; o `Checkbox` é 16 px, como pede a §2.5. */}
      <label
        className={cn(
          "absolute left-1 top-1 grid size-11 place-items-center rounded-md transition-opacity md:size-8",
          selecionado
            ? "opacity-100"
            : "opacity-100 md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100",
        )}
      >
        <span className="sr-only">Selecionar {carrossel.titulo}</span>
        <Checkbox
          checked={selecionado}
          onCheckedChange={(v: boolean | "indeterminate") => onSelecionar(carrossel.id, v === true)}
          aria-label={`Selecionar ${carrossel.titulo}`}
        />
      </label>

      <div className="mt-auto flex items-center gap-0.5 border-t border-border px-1.5 py-1">
        {/* Ação primária do cartão, por estado (§2.3). Na fase 1 só `Gerar`
            existe de fato: é a única que a tela inicial executa sem depender
            do palco de aprovação da fase 2. As demais abrem a ficha da peça. */}
        {carrossel.estado === "a_produzir" ? (
          <Button
            size="sm"
            variant="ghost"
            className="font-semibold text-primary hover:text-primary"
            onClick={() => onAcao("gerar", carrossel)}
            disabled={ocupado}
          >
            Gerar
          </Button>
        ) : (
          <Button
            asChild
            size="sm"
            variant="ghost"
            className="font-semibold text-primary hover:text-primary"
          >
            <Link href={`/carrossel/${carrossel.id}`}>Abrir</Link>
          </Button>
        )}

        <div className="ml-auto" ref={caixaMenu}>
          <Button
            ref={botaoMenu}
            size="sm"
            variant="ghost"
            aria-haspopup="menu"
            aria-expanded={menuAberto}
            aria-label={`Mais ações de ${carrossel.titulo}`}
            title="Mais ações"
            onClick={() => setMenuAberto((v) => !v)}
            disabled={ocupado}
          >
            <MoreHorizontal className="size-4" aria-hidden="true" />
          </Button>

          {menuAberto && (
            <div
              role="menu"
              aria-label={`Ações de ${carrossel.titulo}`}
              className="absolute right-1 z-20 mt-1 w-44 overflow-hidden rounded-md border border-border bg-popover p-1 shadow-popover"
            >
              <button
                type="button"
                role="menuitem"
                onClick={() => acionar("duplicar")}
                className="flex h-9 w-full items-center gap-2 rounded-sm px-2 text-left text-control text-foreground hover:bg-secondary"
              >
                <Copy className="size-3.5" aria-hidden="true" /> Duplicar
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={() => acionar("historico")}
                className="flex h-9 w-full items-center gap-2 rounded-sm px-2 text-left text-control text-foreground hover:bg-secondary"
              >
                <Clock className="size-3.5" aria-hidden="true" /> Histórico
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={() => acionar("link")}
                className="flex h-9 w-full items-center gap-2 rounded-sm px-2 text-left text-control text-foreground hover:bg-secondary"
              >
                {carrossel.publico_ativo ? (
                  <>
                    <Unlink className="size-3.5" aria-hidden="true" /> Revogar link
                  </>
                ) : (
                  <>
                    <Link2 className="size-3.5" aria-hidden="true" /> Link público
                  </>
                )}
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={() => acionar("excluir")}
                className="flex h-9 w-full items-center gap-2 rounded-sm px-2 text-left text-control text-destructive hover:bg-secondary"
              >
                <Trash2 className="size-3.5" aria-hidden="true" /> Excluir
              </button>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}
