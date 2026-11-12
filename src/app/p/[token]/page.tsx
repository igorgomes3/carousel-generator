/**
 * Link público do carrossel: `/p/<token>`.
 *
 * Busca no servidor (a API é interna, não precisa passar pelo navegador) e
 * renderiza somente leitura. Token inválido ou revogado cai em 404 — revogar tem
 * que valer imediatamente, não "no próximo login".
 */
import { notFound } from "next/navigation";
import { DocumentProvider } from "@/lib/providers/document-provider";
import { VisualizadorPublico } from "@/components/visualizador-publico";

const API_URL = process.env.AUTOCLINIC_API_URL ?? "http://100.87.192.48:8097";

export const dynamic = "force-dynamic";

async function buscarProjeto(token: string) {
  const res = await fetch(`${API_URL}/api/publico/carrossel/${token}`, {
    cache: "no-store",
  }).catch(() => null);
  if (!res || !res.ok) return null;
  const dados = (await res.json().catch(() => null)) as
    | { carrossel?: { titulo: string; documento: unknown; atualizado_em?: string } }
    | null;
  return dados?.carrossel ?? null;
}

export default async function PaginaPublica({ params }: { params: { token: string } }) {
  const projeto = await buscarProjeto(params.token);
  if (!projeto) notFound();

  return (
    <main className="min-h-screen bg-muted/30">
      <header className="border-b bg-card">
        <div className="mx-auto max-w-3xl px-4 h-14 flex items-center justify-between">
          <span className="font-semibold tracking-tight truncate">{projeto.titulo}</span>
          <span className="text-xs text-muted-foreground">carrossel compartilhado</span>
        </div>
      </header>
      <DocumentProvider documentoInicial={projeto.documento}>
        <VisualizadorPublico />
      </DocumentProvider>
    </main>
  );
}
