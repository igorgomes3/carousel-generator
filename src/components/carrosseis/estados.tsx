"use client";

/**
 * Os quatro estados obrigatórios da tela inicial (§2.6).
 *
 * Regras que estão aqui e não na página, porque são regra de tela e não de
 * fluxo:
 *   Carregando — skeleton com a GEOMETRIA do cartão real (capa de 78 px, duas
 *     linhas de 14 px, uma de 12 px, rodapé de 28 px), seis cartões. Sem spinner
 *     central: spinner no meio faz a tela piscar inteira a cada troca de aba;
 *   Vazio — três textos diferentes, porque "nenhum carrossel na organização",
 *     "nada nesta aba" e "a busca não achou" pedem ações diferentes;
 *   Erro — faixa `#B91C1C` sobre `#FEF2F2` acima do grid, com o texto do
 *     servidor e `Tentar de novo`. O grid anterior NÃO é limpo: perder a lista
 *     por causa de uma falha de rede na paginação é pior do que ver a faixa.
 *
 * As cores do erro são hex e não token: `--destructive` é vermelho de ação
 * (botão), não de aviso, e a §2.6 pede este par específico.
 */
import { AlertCircle, Inbox, SearchX } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export function FaixaErro({ mensagem, onTentar }: { mensagem: string; onTentar: () => void }) {
  return (
    <div
      role="alert"
      data-estado="erro"
      className="mb-3 flex flex-wrap items-center gap-3 rounded-md border border-[#FCA5A5] bg-[#FEF2F2] px-3 py-2 text-body text-[#B91C1C]"
    >
      <AlertCircle className="size-4 shrink-0" aria-hidden="true" />
      <p className="min-w-0 flex-1">{mensagem}</p>
      <Button size="sm" variant="outline" onClick={onTentar} className="border-[#FCA5A5]">
        Tentar de novo
      </Button>
    </div>
  );
}

/** Seis cartões com a geometria do cartão real — nada de bloco cinza genérico. */
export function EsqueletoLista({ cartoes = 6 }: { cartoes?: number }) {
  return (
    <div
      data-estado="carregando"
      role="status"
      aria-busy="true"
      aria-live="polite"
      className="grid gap-3 md:grid-cols-2 xl:grid-cols-3"
    >
      <span className="sr-only">Carregando carrosséis…</span>
      {Array.from({ length: cartoes }).map((_, i) => (
        <div key={i} className="flex flex-col overflow-hidden rounded-lg border border-border bg-card">
          <div className="flex gap-3 p-card">
            <Skeleton className="h-[98px] w-thumb shrink-0 rounded-sm" />
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <Skeleton className="h-[14px] w-full" />
              <Skeleton className="h-[14px] w-3/4" />
              <Skeleton className="h-[12px] w-2/3" />
              <Skeleton className="h-5 w-24 rounded-sm" />
            </div>
          </div>
          <div className="flex h-row items-center gap-2 border-t border-border px-1.5">
            <Skeleton className="h-[14px] w-12" />
            <Skeleton className="ml-auto h-[14px] w-6" />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Vazio de organização: borda tracejada, 40 px de padding, dois caminhos
 * ("Ver sinais" e "Novo"). É o único vazio que oferece criar.
 */
export function VazioOrganizacao({
  onNovo,
  criando,
  linkSinais = "/sinais",
}: {
  onNovo: () => void;
  criando: boolean;
  linkSinais?: string;
}) {
  return (
    <div
      data-estado="vazio"
      className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-input px-5 py-10 text-center"
    >
      <Inbox className="size-6 text-muted-foreground" aria-hidden="true" />
      <p className="max-w-md text-body text-subtle">
        Nenhum carrossel ainda. Colete sinais para gerar o primeiro, ou crie em branco.
      </p>
      <div className="flex flex-wrap items-center justify-center gap-2">
        <Button asChild variant="outline">
          <a href={linkSinais}>Ver sinais</a>
        </Button>
        <Button onClick={onNovo} disabled={criando}>
          {criando ? "Criando…" : "Novo"}
        </Button>
      </div>
    </div>
  );
}

/** Aba vazia com carrosséis em outra aba: "Nada em A produzir." + "Ver todas (58)". */
export function VazioAba({
  aba,
  total,
  onVerTodas,
}: {
  aba: string;
  total: number;
  onVerTodas: () => void;
}) {
  return (
    <div
      data-estado="vazio-aba"
      className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-input px-5 py-10 text-center"
    >
      <p className="text-body text-subtle">
        Nada em <strong className="font-semibold text-foreground">{aba}</strong>.
      </p>
      <Button variant="ghost" onClick={onVerTodas}>
        Ver todas ({total})
      </Button>
    </div>
  );
}

/** Busca sem resultado: "Nada encontrado para *termo*." + "Limpar busca". */
export function VazioBusca({ termo, onLimpar }: { termo: string; onLimpar: () => void }) {
  return (
    <div
      data-estado="vazio-busca"
      className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-input px-5 py-10 text-center"
    >
      <SearchX className="size-6 text-muted-foreground" aria-hidden="true" />
      <p className="text-body text-subtle">
        Nada encontrado para <em className="text-foreground">{termo}</em>.
      </p>
      <Button variant="outline" onClick={onLimpar}>
        Limpar busca
      </Button>
    </div>
  );
}
