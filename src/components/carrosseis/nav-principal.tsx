"use client";

/**
 * Navegação superior das telas de trabalho — 48 px, três destinos, sem menu
 * escondido (§1.2 do plano).
 *
 * Por que não é o `MainNav` do editor: aquela barra mostra o documento aberto,
 * o contador de slide e o botão de exportar — informação do editor, que não
 * existe fora dele. Duas barras com propósitos diferentes é melhor do que uma
 * com seis condicionais.
 *
 * `Carrossel · Carrosséis Sinais Configurações` no topo e, à direita, e-mail e
 * `Sair`. Sem avatar, sem sino, sem contador: usuário único não tem para quem
 * notificar.
 */
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import { sair, type UsuarioCarrossel } from "@/lib/auth/sessao";
import { cn } from "@/lib/utils";

const DESTINOS = [
  { href: "/", rotulo: "Carrosséis" },
  { href: "/sinais", rotulo: "Sinais" },
  { href: "/configuracoes", rotulo: "Configurações" },
] as const;

/** Marca: mesmo losango do editor, para as telas não parecerem outro produto. */
function Marca() {
  return (
    <span
      aria-hidden="true"
      className="grid size-[22px] shrink-0 place-items-center rounded-sm bg-primary text-primary-foreground"
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
  );
}

export function NavPrincipal({ usuario }: { usuario: UsuarioCarrossel | null }) {
  const caminho = usePathname() ?? "/";
  const router = useRouter();

  function aoSair() {
    sair();
    router.replace("/login");
  }

  return (
    <header className="flex h-topbar shrink-0 items-center gap-2 border-b border-border bg-background px-3 md:gap-4 md:px-page">
      <Link
        href="/"
        // No mobile o wordmark fica escondido (`hidden sm:inline`) e sobra só o
        // ícone, que é `aria-hidden`. Sem este rótulo o link fica sem nome
        // acessível — axe reprova em `link-name`, e teclado/voz chegam num
        // controle anônimo.
        aria-label="Carrossel"
        className="flex shrink-0 items-center gap-2 rounded-sm text-body font-semibold tracking-[-0.01em]"
      >
        <Marca />
        <span className="hidden sm:inline">Carrossel</span>
      </Link>

      <nav aria-label="Principal" className="flex min-w-0 items-center gap-1">
        {DESTINOS.map((destino) => {
          const ativo = destino.href === "/" ? caminho === "/" : caminho.startsWith(destino.href);
          return (
            <Link
              key={destino.href}
              href={destino.href}
              aria-current={ativo ? "page" : undefined}
              className={cn(
                "inline-flex h-11 items-center rounded-sm px-2 text-control md:h-8",
                ativo
                  ? "border-b-2 border-primary font-semibold text-foreground"
                  : "border-b-2 border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              {destino.rotulo}
            </Link>
          );
        })}
      </nav>

      <div className="ml-auto flex min-w-0 items-center gap-2">
        {usuario?.email && (
          <span className="hidden truncate text-meta text-muted-foreground sm:inline">
            {usuario.email}
          </span>
        )}
        <button
          type="button"
          onClick={aoSair}
          className="inline-flex h-11 items-center rounded-sm px-2 text-control text-subtle hover:bg-secondary hover:text-foreground md:h-8"
        >
          Sair
        </button>
      </div>
    </header>
  );
}
