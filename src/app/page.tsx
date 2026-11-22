import { Suspense } from "react";

import { Estudio } from "@/components/estudio/estudio";

/**
 * `/` — o estúdio: a home do produto virou o wizard do CarrosseIA.
 *
 * A lista com abas, filtros de fonte e cara de painel de operador saiu daqui; o
 * histórico aparece enxuto dentro do estúdio ("Meus carrosséis"). O que a raiz
 * responde agora é a pergunta do leigo: "como eu faço meu carrossel?".
 *
 * `force-dynamic` porque o middleware redireciona por cookie de sessão e a tela
 * lê a lista de projetos: nada aqui pode nascer estático.
 */
export const dynamic = "force-dynamic";

export default function Home() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <p className="text-body text-muted-foreground">Carregando estúdio…</p>
        </div>
      }
    >
      <Estudio />
    </Suspense>
  );
}
