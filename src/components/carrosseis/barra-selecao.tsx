"use client";

/**
 * Barra de seleção (§2.5).
 *
 * Com 1+ cartão marcado ela TROCA o cabeçalho da tela: mesmo lugar, mesma
 * altura, funções diferentes. Some quando não há seleção — uma barra de ações
 * desabilitadas em cima de uma lista é ruído permanente.
 *
 * As ações, e o que cada uma custa:
 *   Aprovar N        — uma requisição por id contra a rota de aprovação. O que
 *                      não está `aguardando_aprovacao`/`pronta` volta em
 *                      `ignorados[]` e o aviso diz quantos e por quê;
 *   Excluir N        — dois passos, com o texto que a exclusão de um já usa
 *                      ("apaga o carrossel e todo o histórico");
 *   Marcar publicado — pede a data (padrão hoje) e confirma: é irreversível na
 *                      prática, então não é um clique solto;
 *   Baixar N (ZIP)   — fora desta rodada; ver `docs/design/fase-1-decisoes.md`.
 *                      O botão fica desabilitado com o motivo no `title`, em vez
 *                      de baixar um ZIP vazio.
 */
import { CalendarCheck, CheckCheck, Download, Trash2, X } from "lucide-react";

import { Button } from "@/components/ui/button";

export function BarraSelecao({
  quantidade,
  total,
  ocupado,
  pedindoConfirmacao,
  pedindoData,
  dataPublicacao,
  onDataPublicacao,
  onAprovar,
  onPedirExclusao,
  onConfirmarExclusao,
  onPedirData,
  onConfirmarPublicado,
  onCancelar,
  onLimpar,
}: {
  quantidade: number;
  total: number;
  ocupado: boolean;
  pedindoConfirmacao: boolean;
  pedindoData: boolean;
  dataPublicacao: string;
  onDataPublicacao: (data: string) => void;
  onAprovar: () => void;
  onPedirExclusao: () => void;
  onConfirmarExclusao: () => void;
  onPedirData: () => void;
  onConfirmarPublicado: () => void;
  onCancelar: () => void;
  onLimpar: () => void;
}) {
  return (
    <div
      data-selecao="1"
      className="flex min-h-touch flex-wrap items-center gap-2 rounded-md border border-primary/30 bg-accent px-2 py-1.5"
    >
      <p className="text-control font-semibold text-accent-foreground">
        {quantidade} selecionado{quantidade === 1 ? "" : "s"}
        <span className="ml-1 font-normal opacity-70">de {total}</span>
      </p>

      {pedindoConfirmacao ? (
        <>
          <p className="min-w-0 flex-1 text-meta text-foreground">
            Excluir {quantidade} apaga {quantidade === 1 ? "o carrossel" : "os carrosséis"} e todo o
            histórico. Não tem como desfazer.
          </p>
          <Button size="sm" variant="destructive" onClick={onConfirmarExclusao} disabled={ocupado}>
            Excluir de vez
          </Button>
          <Button size="sm" variant="ghost" onClick={onCancelar} disabled={ocupado}>
            Cancelar
          </Button>
        </>
      ) : pedindoData ? (
        <>
          <label className="flex items-center gap-2 text-meta text-foreground">
            Publicado em
            <input
              type="date"
              value={dataPublicacao}
              onChange={(e) => onDataPublicacao(e.target.value)}
              aria-label="Data de publicação"
              className="h-11 rounded-sm border border-input bg-background px-2 text-control md:h-8"
            />
          </label>
          <Button size="sm" onClick={onConfirmarPublicado} disabled={ocupado}>
            Confirmar
          </Button>
          <Button size="sm" variant="ghost" onClick={onCancelar} disabled={ocupado}>
            Cancelar
          </Button>
        </>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-1.5">
            <Button size="sm" variant="outline" onClick={onAprovar} disabled={ocupado}>
              <CheckCheck className="size-3.5" aria-hidden="true" />
              Aprovar {quantidade}
            </Button>
            <Button size="sm" variant="outline" onClick={onPedirData} disabled={ocupado}>
              <CalendarCheck className="size-3.5" aria-hidden="true" />
              Marcar publicado
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled
              title="O ZIP em lote depende do render de cada slide no servidor (fase 5). Hoje o export é do editor, slide a slide."
            >
              <Download className="size-3.5" aria-hidden="true" />
              Baixar {quantidade} (ZIP)
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="text-destructive hover:text-destructive"
              onClick={onPedirExclusao}
              disabled={ocupado}
            >
              <Trash2 className="size-3.5" aria-hidden="true" />
              Excluir {quantidade}
            </Button>
          </div>
          <Button
            size="sm"
            variant="ghost"
            className="ml-auto"
            onClick={onLimpar}
            aria-label="Limpar seleção"
          >
            <X className="size-4" aria-hidden="true" />
          </Button>
        </>
      )}
    </div>
  );
}
