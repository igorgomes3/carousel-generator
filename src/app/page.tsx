"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Editor from "@/components/editor";
import { DocumentProvider } from "@/lib/providers/document-provider";

/**
 * O editor aceita `?projeto=<id>`: abre o documento salvo e liga o autosave.
 * Sem o parâmetro continua sendo o editor "novo", que persiste no navegador —
 * é o modo que a galeria oferece para importar uma vez e aposentar.
 *
 * A faixa "Projeto salvo — as alterações são gravadas automaticamente" saiu daqui
 * na direção A: virou a linha de status do palco, que já diz a mesma coisa e
 * ainda informa quantos slides existem e em que escala. Duas faixas dizendo
 * "está salvo" era o tipo de ruído que a direção remove.
 */
function EditorComProjeto() {
  const params = useSearchParams();
  const projetoId = params.get("projeto");

  return (
    <DocumentProvider projetoId={projetoId}>
      <Editor />
    </DocumentProvider>
  );
}

export default function Home() {
  return (
    // `fixed inset-0` e não `h-screen`: dentro de um body flex de altura
    // automática, `flex-1` + `h-screen` resolvia para a altura do CONTEÚDO
    // (2159 px em 1280×900), e o filmstrip caía fora da dobra. Preso à viewport,
    // a cadeia de flex ganha altura definida e só o palco rola.
    <main className="fixed inset-0 flex flex-col overflow-hidden bg-background">
      <Suspense
        fallback={
          <div className="flex-1 flex items-center justify-center">
            <p className="text-body text-muted-foreground">Carregando editor…</p>
          </div>
        }
      >
        <EditorComProjeto />
      </Suspense>
    </main>
  );
}
