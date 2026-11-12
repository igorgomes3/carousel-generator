"use client";

/**
 * Cartão de projeto da galeria — direção A.
 *
 * Card horizontal: miniatura 4:5 de 78 px, título em duas linhas, uma linha de
 * metadados (`v4 · 7 slides · há 2 h`), etiqueta de estado com autor e as ações
 * no rodapé do card. A densidade é o ponto: seis carrosséis na primeira tela em
 * 1280, cada um legível sem hover.
 *
 * A miniatura NÃO é o slide renderizado: `/carrossel/carrosseis` devolve título,
 * versão, contagem de slides e autor, mas não o documento. Então ela mostra o
 * título real sobre um tom derivado do id — a alternativa seria uma chamada por
 * card só para pintar 78 px, e isso é caro no load da galeria. Quando a API
 * devolver a capa, este componente passa a receber a cor.
 */
import Link from "next/link";
import { Clock, Copy, Link2, Trash2, Unlink } from "lucide-react";

import { Button } from "@/components/ui/button";
import { EtiquetaEstado } from "@/components/ui/etiqueta-estado";

export interface ProjetoGaleria {
  id: string;
  titulo: string;
  versao_atual: number;
  publico_ativo: boolean;
  atualizado_em: string;
  slides: number;
  autor_nome: string | null;
  autor_email: string | null;
}

/** Tons do mockup aprovado, escolhidos de forma estável por id. */
const TONS = ["#123B32", "#242743", "#3A2A1B", "#1B2532", "#2A1B2C", "#14262F"];

function tomDoProjeto(id: string): string {
  let soma = 0;
  for (let i = 0; i < id.length; i += 1) soma = (soma + id.charCodeAt(i)) % 9973;
  return TONS[soma % TONS.length];
}

/** "há 2 h", "há 1 dia", "há 3 dias" — relativo e curto, cabe na linha. */
export function quandoRelativo(iso: string): string {
  const data = new Date(iso);
  if (Number.isNaN(data.getTime())) return "—";
  const minutos = Math.max(0, Math.round((Date.now() - data.getTime()) / 60000));
  if (minutos < 60) return minutos <= 1 ? "agora" : `há ${minutos} min`;
  const horas = Math.round(minutos / 60);
  if (horas < 24) return `há ${horas} h`;
  const dias = Math.round(horas / 24);
  return dias === 1 ? "há 1 dia" : `há ${dias} dias`;
}

export function CartaoProjeto({
  projeto,
  ocupado,
  confirmandoLink,
  excluindo,
  onDuplicar,
  onHistorico,
  onAlternarLink,
  onConfirmarLink,
  onExcluir,
  onPedirExclusao,
  onCancelar,
}: {
  projeto: ProjetoGaleria;
  ocupado: boolean;
  confirmandoLink: boolean;
  excluindo: boolean;
  onDuplicar: () => void;
  onHistorico: () => void;
  onAlternarLink: () => void;
  onConfirmarLink: () => void;
  onExcluir: () => void;
  onPedirExclusao: () => void;
  onCancelar: () => void;
}) {
  const autor = projeto.autor_nome ?? projeto.autor_email ?? "autor desconhecido";

  return (
    <article className="flex flex-col overflow-hidden rounded-lg border border-border bg-card shadow-card transition-colors hover:border-input">
      <div className="flex gap-3 p-card">
        {/* Miniatura: título real do carrossel sobre o tom do card. */}
        <div
          aria-hidden="true"
          data-preview="1"
          className="flex aspect-[4/5] w-thumb shrink-0 flex-col justify-between overflow-hidden rounded-sm p-1.5 text-white"
          style={{ backgroundColor: tomDoProjeto(projeto.id) }}
        >
          <span className="overflow-hidden text-[7.5px] font-semibold leading-[1.25] tracking-[-0.01em] [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:4]">
            {projeto.titulo}
          </span>
          <span className="flex items-center justify-between text-[6.5px] tabular-nums opacity-70">
            <span className="grid size-2.5 place-items-center rounded-pill bg-white/20 text-[5px] font-bold">
              AC
            </span>
            <span>1/{projeto.slides}</span>
          </span>
        </div>

        <div className="flex min-w-0 flex-1 flex-col">
          <h3 className="line-clamp-2 h-[2.6em] text-card-title font-semibold text-foreground">
            {projeto.titulo}
          </h3>
          <p className="mt-1.5 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-meta tabular-nums text-muted-foreground">
            <span>v{projeto.versao_atual}</span>
            <span aria-hidden="true" className="size-[3px] rounded-pill bg-input" />
            <span>
              {projeto.slides} {projeto.slides === 1 ? "slide" : "slides"}
            </span>
            <span aria-hidden="true" className="size-[3px] rounded-pill bg-input" />
            <span>{quandoRelativo(projeto.atualizado_em)}</span>
          </p>
          <p className="mt-1.5 flex items-center gap-2 text-meta text-muted-foreground">
            {projeto.publico_ativo ? (
              <EtiquetaEstado tom="ativo">Link ativo</EtiquetaEstado>
            ) : (
              <EtiquetaEstado>Sem link</EtiquetaEstado>
            )}
            <span className="truncate">{autor}</span>
          </p>
        </div>
      </div>

      {excluindo && (
        <div className="mx-card mb-3 rounded-md border border-destructive/40 bg-destructive/5 p-3">
          <p className="text-meta text-foreground">
            Excluir <strong>{projeto.titulo}</strong> apaga o carrossel e todo o histórico de
            versões. Não tem como desfazer, e o link público deixa de abrir.
          </p>
          <div className="mt-2 flex gap-2">
            <Button size="sm" variant="destructive" onClick={onExcluir} disabled={ocupado}>
              Excluir de vez
            </Button>
            <Button size="sm" variant="ghost" onClick={onCancelar}>
              Cancelar
            </Button>
          </div>
        </div>
      )}

      {confirmandoLink && (
        <div className="mx-card mb-3 rounded-md border border-destructive/40 bg-destructive/5 p-3">
          <p className="text-meta text-foreground">
            Revogar o link de <strong>{projeto.titulo}</strong>? Quem tiver a URL deixa de
            abrir o carrossel na hora, e republicar mantém a mesma URL.
          </p>
          <div className="mt-2 flex gap-2">
            <Button size="sm" variant="destructive" onClick={onConfirmarLink} disabled={ocupado}>
              Revogar
            </Button>
            <Button size="sm" variant="ghost" onClick={onCancelar}>
              Cancelar
            </Button>
          </div>
        </div>
      )}

      <div className="mt-auto flex flex-nowrap items-center gap-0.5 border-t border-border px-1.5 py-1">
        <Button
          asChild
          size="sm"
          variant="ghost"
          className="font-semibold text-primary hover:text-primary"
        >
          <Link href={`/?projeto=${projeto.id}`}>Abrir</Link>
        </Button>
        <Button size="sm" variant="ghost" onClick={onDuplicar} disabled={ocupado}>
          <Copy className="size-3.5" aria-hidden="true" />
          Duplicar
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={onHistorico}
          aria-label={`Histórico de versões de ${projeto.titulo}`}
          title="Histórico de versões"
        >
          <Clock className="size-3.5" aria-hidden="true" />
        </Button>
        <div className="ml-auto flex items-center gap-0.5">
          {projeto.publico_ativo ? (
            <Button
              size="sm"
              variant="ghost"
              className="text-subtle"
              onClick={onConfirmarLink}
              disabled={ocupado}
              aria-label={`Revogar link público de ${projeto.titulo}`}
              title="Revogar link público"
            >
              <Unlink className="size-3.5" aria-hidden="true" />
            </Button>
          ) : (
            <Button
              size="sm"
              variant="ghost"
              className="text-subtle"
              onClick={onAlternarLink}
              disabled={ocupado}
              aria-label={`Gerar link público de ${projeto.titulo}`}
              title="Gerar link público"
            >
              <Link2 className="size-3.5" aria-hidden="true" />
            </Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            className="text-muted-foreground hover:text-destructive"
            onClick={onPedirExclusao}
            disabled={ocupado}
            aria-label={`Excluir ${projeto.titulo}`}
            title="Excluir carrossel"
          >
            <Trash2 className="size-3.5" aria-hidden="true" />
          </Button>
        </div>
      </div>
    </article>
  );
}
