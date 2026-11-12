import { Suspense } from "react";

import { ListaCarrosseis } from "@/components/carrosseis/lista-carrosseis";

/**
 * `/` — a tela inicial de carrosséis (§2 do plano de UI).
 *
 * Server component de propósito, mesmo com a tela inteira sendo cliente: é
 * aqui, e só aqui, que `process.env` significa algo em runtime. O `next start`
 * roda com `NODE_ENV=production`, então os estados de dev da §2.6
 * (`?estado=vazio|carregando|erro`) precisam de uma porta explícita —
 * `ESTADOS_DEV=1` no ambiente do servidor. Em `next dev` ela já vem aberta.
 * Ler isso dentro de um componente cliente não funcionaria: `process.env` sem
 * prefixo `NEXT_PUBLIC_` é trocado por `undefined` no bundle do navegador.
 *
 * `Suspense` porque `useSearchParams` no cliente exige fronteira: sem ela o
 * build falha com "useSearchParams() should be wrapped in a suspense boundary".
 */
// Renderização por requisição: `ESTADOS_DEV` é lido em runtime. Como página
// estática, o `next build` congela `process.env` e o portão dos estados de dev
// nasceria sempre fechado em `next start`.
export const dynamic = "force-dynamic";

export default function Home() {
  const estadosDevLiberados =
    process.env.NODE_ENV !== "production" || process.env.ESTADOS_DEV === "1";

  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <p className="text-body text-muted-foreground">Carregando carrosséis…</p>
        </div>
      }
    >
      <ListaCarrosseis estadosDevLiberados={estadosDevLiberados} />
    </Suspense>
  );
}
