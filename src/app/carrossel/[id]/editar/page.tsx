"use client";

import { Suspense } from "react";
import { useParams } from "next/navigation";

import Editor from "@/components/editor";
import { DocumentProvider } from "@/lib/providers/document-provider";

/**
 * `/carrossel/<id>/editar` — o editor.
 *
 * Antes ele morava em `/` com `?projeto=<id>`, e `/` sem parâmetro era um
 * "editor novo" que gravava em `localStorage`. A §1.3 do plano move o editor
 * para cá e a §1.4 aposenta o modo sem id: todo carrossel tem id, o rascunho de
 * navegador deixa de existir como fonte. `/` virou a lista de carrosséis.
 *
 * O `id` vem da rota, não de query string: `?projeto=` continua sendo aceito só
 * como link antigo, e o `next.config.js` responde `301` para cá.
 */
function EditorDoCarrossel() {
  const params = useParams<{ id: string }>();
  const id = typeof params?.id === "string" ? params.id : null;

  return (
    <DocumentProvider projetoId={id}>
      <Editor />
    </DocumentProvider>
  );
}

export default function PaginaDoEditor() {
  return (
    // `fixed inset-0` e não `h-screen`: dentro de um body flex de altura
    // automática, `flex-1` + `h-screen` resolvia para a altura do CONTEÚDO
    // (2159 px em 1280×900), e o filmstrip caía fora da dobra. Preso à viewport,
    // a cadeia de flex ganha altura definida e só o palco rola.
    <main className="fixed inset-0 flex flex-col overflow-hidden bg-background">
      <Suspense
        fallback={
          <div className="flex flex-1 items-center justify-center">
            <p className="text-body text-muted-foreground">Carregando editor…</p>
          </div>
        }
      >
        <EditorDoCarrossel />
      </Suspense>
    </main>
  );
}
