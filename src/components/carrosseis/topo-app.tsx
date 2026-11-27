"use client";

/**
 * Barra superior única do produto.
 *
 * Antes cada tela (projetos, admin, autopilot, configurações) desenhava a própria
 * barra, e três delas repetiam os mesmos dois botões. Quatro cópias divergem: o
 * botão novo entrava em uma e esquecia nas outras. Aqui existe uma só.
 *
 * O botão **Admin** é condicional: aparece apenas quando `/api/auth/eu` responde
 * `admin: true` (a lista vive em `CARROSSEL_ADMINS`, no servidor). A autoridade
 * continua sendo o 403 das rotas de admin; o botão é conveniência, não permissão.
 */
import { useEffect, useState } from "react";

import { MenuConta } from "@/components/conta/menu-conta";

const COR = {
  tinta: "#0B1220",
  acao: "#0E7490",
  borda: "#E2E8F0",
};

export type DestinoTopo = "projetos" | "estudio" | "admin" | "config";

export function TopoApp({ ativo }: { ativo?: DestinoTopo }) {
  const [admin, setAdmin] = useState(false);

  useEffect(() => {
    let vivo = true;
    fetch("/api/auth/eu", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { usuario?: { admin?: boolean } } | null) => {
        if (vivo) setAdmin(Boolean(d?.usuario?.admin));
      })
      .catch(() => {});
    return () => {
      vivo = false;
    };
  }, []);

  const pilula = (destino: DestinoTopo, href: string, rotuloCurto: string, rotulo: string) => {
    const estaAtivo = ativo === destino;
    return (
      <a
        key={destino}
        href={href}
        aria-current={estaAtivo ? "page" : undefined}
        className="inline-flex h-10 items-center rounded-lg px-3 text-[13px] font-semibold"
        style={{
          color: COR.tinta,
          border: `1px solid ${estaAtivo ? COR.acao : COR.borda}`,
          backgroundColor: estaAtivo ? "#ECFEFF" : "#fff",
        }}
      >
        <span className="sm:hidden">{rotuloCurto}</span>
        <span className="hidden sm:inline">{rotulo}</span>
      </a>
    );
  };

  return (
    <header
      className="sticky top-0 z-20 border-b"
      style={{ backgroundColor: "#FFFFFFEE", borderColor: COR.borda, backdropFilter: "blur(8px)" }}
    >
      <div className="mx-auto flex h-14 w-full max-w-[1100px] items-center justify-between px-4 sm:px-6">
        <a href="/" className="flex min-w-0 items-center gap-2">
          <span
            aria-hidden="true"
            className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-[15px] font-bold text-white"
            style={{ backgroundColor: COR.acao }}
          >
            X
          </span>
          <span className="hidden text-[16px] font-bold tracking-tight sm:inline" style={{ color: COR.tinta }}>
            CONTENT<span style={{ color: COR.acao }}>X</span>
          </span>
        </a>

        <div className="flex shrink-0 items-center gap-2">
          {pilula("projetos", "/projetos", "Projetos", "Meus projetos")}
          {pilula("estudio", "/", "Estúdio", "Ir ao estúdio")}
          {/* Só para administrador. O `admin` vem do servidor, nunca do e-mail na tela. */}
          {admin ? pilula("admin", "/admin", "Admin", "Admin") : null}
          <MenuConta />
        </div>
      </div>
    </header>
  );
}
