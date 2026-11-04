"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Editor from "@/components/editor";
import { DocumentProvider } from "@/lib/providers/document-provider";

/**
 * O editor aceita `?projeto=<id>`: abre o documento salvo e liga o autosave.
 * Sem o parâmetro continua sendo o editor "novo", que persiste no navegador —
 * é o modo que a galeria oferece para importar uma vez e aposentar.
 */
function EditorComProjeto() {
  const params = useSearchParams();
  const projetoId = params.get("projeto");

  return (
    <DocumentProvider projetoId={projetoId}>
      {projetoId && (
        <div className="flex items-center justify-between gap-2 border-b bg-card px-4 py-1.5 text-xs">
          <span className="text-muted-foreground">
            Projeto salvo — as alterações são gravadas automaticamente.
          </span>
          <Link href="/projetos" className="text-primary underline">
            Voltar para a galeria
          </Link>
        </div>
      )}
      <Editor />
    </DocumentProvider>
  );
}

export default function Home() {
  return (
    <main className="flex-1 h-full min-h-full flex flex-col justify-stretch">
      <Suspense
        fallback={
          <div className="flex-1 flex items-center justify-center">
            <p className="text-sm text-muted-foreground">Carregando editor…</p>
          </div>
        }
      >
        <EditorComProjeto />
      </Suspense>
    </main>
  );
}
