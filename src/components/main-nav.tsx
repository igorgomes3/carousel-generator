import * as React from "react";
import Link from "next/link";
import { useFormContext } from "react-hook-form";
import { Download, Loader2Icon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "./ui/button";
import { EditorMenubar } from "./editor-menubar";
import Pager from "./pager";
import { useSalvamento } from "@/lib/providers/salvamento-context";
import type { DocumentFormReturn } from "@/lib/document-form-types";

interface MainNavProps {
  handleDownloadPngs: () => void;
  isExporting: boolean;
  className?: string;
}

/**
 * Barra do topo — 48 px, uma linha, sem ornamento (direção A).
 *
 * Ordem de leitura: marca → em que documento estou → em que slide → ações. O
 * crumb mostra o nome do arquivo em vez do chrome em inglês do projeto de
 * origem ("File", "Carousel Generator"), que o DESIGN.md já registrava como
 * dívida visual.
 *
 * Só existe UMA ação preenchida na tela: exportar. O acento indigo aparece aqui
 * e em lugar nenhum mais desta barra.
 */
export function MainNav({ handleDownloadPngs, isExporting, className }: MainNavProps) {
  const form: DocumentFormReturn = useFormContext();
  const filename = form.watch("filename") as string | undefined;
  const salvamento = useSalvamento();
  const temProjeto = Boolean(salvamento?.projetoId);

  return (
    <div
      className={cn(
        "flex h-12 shrink-0 items-center gap-2 border-b border-border bg-background px-3 md:gap-3 md:px-4",
        className
      )}
    >
      <Link
        href="/"
        className="flex shrink-0 items-center gap-2 rounded-sm text-body font-semibold tracking-[-0.01em]"
      >
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

      <div className="flex min-w-0 items-center gap-1.5 text-meta text-muted-foreground">
        <span aria-hidden="true">/</span>
        <span className="truncate font-medium text-subtle">
          {filename || "Carrossel sem título"}
        </span>
      </div>

      <div className="ml-auto flex items-center gap-2">
        <div className="hidden md:block">
          <Pager />
        </div>
        <EditorMenubar />
        <Button
          onClick={handleDownloadPngs}
          disabled={isExporting}
          title="Baixar PNGs 1080×1350, um por slide, prontos para o Instagram"
          className="w-11 px-0 sm:w-auto sm:px-3"
        >
          {isExporting ? (
            <Loader2Icon className="size-4 animate-spin" aria-hidden="true" />
          ) : (
            <Download className="size-4" aria-hidden="true" />
          )}
          <span className="hidden sm:inline">
            {isExporting ? "Gerando…" : "Exportar PNGs"}
          </span>
          <span className="sr-only sm:hidden">
            {isExporting ? "Gerando PNGs" : "Exportar PNGs"}
          </span>
        </Button>
        {temProjeto && (
          <Link
            href="/"
            className="hidden rounded-sm px-2 text-meta font-medium text-subtle hover:bg-secondary hover:text-foreground md:inline-flex md:h-8 md:items-center"
          >
            Carrosséis
          </Link>
        )}
      </div>
    </div>
  );
}
