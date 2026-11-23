/**
 * Link público do carrossel: `/p/<token>`.
 *
 * Muda nesta versão (W97): o projeto vem do banco do **próprio carrossel**
 * (tabela `projetos`, coluna `token_publico`), não mais da API do AutoClinic.
 * Usa `service_role` no servidor porque quem abre o link não tem conta — e é
 * exatamente por isso que o token é um UUID opaco: ele É a credencial. Token
 * inválido, de projeto apagado ou de outro formato cai em 404.
 */
import { notFound } from "next/navigation";

import { GaleriaPublica } from "@/components/publico/galeria-publica";
import { projetoPorToken } from "@/lib/estudio/armazenamento";

export const dynamic = "force-dynamic";

export default async function PaginaPublica({ params }: { params: { token: string } }) {
  const projeto = await projetoPorToken(params.token).catch(() => null);
  if (!projeto) notFound();

  return (
    <main className="min-h-screen bg-[#FAF9F7]">
      <header className="border-b border-[#E7E5E4] bg-white">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-4">
          <span className="truncate font-semibold tracking-tight text-[#1C1917]">
            {projeto.nome}
          </span>
          <span className="text-[12px] text-[#78716C]">carrossel compartilhado</span>
        </div>
      </header>
      <GaleriaPublica projeto={projeto} />
    </main>
  );
}
