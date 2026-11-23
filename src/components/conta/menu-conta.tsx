"use client";

/**
 * Menu da conta — quem está logado e como sair.
 *
 * O que existia antes (issue #19): o estúdio não mostrava **ninguém**. A pessoa
 * entrava com a conta do AutoClinic, trabalhava, e não tinha nem o próprio
 * e-mail na tela nem uma forma de sair: fechar a aba era a única saída, e o
 * refresh token ficava no navegador por 30 dias. Num computador emprestado isso
 * é uma sessão de outra pessoa aberta.
 *
 * Decisões que valem explicação:
 *
 * - **A identidade carrega sozinha** (`/api/ac/me`), em vez de vir por prop. O
 *   mesmo componente entra no estúdio, em "Meus projetos" e onde mais precisar,
 *   sem cada tela ter que buscar a sessão antes de renderizar o chrome.
 * - **No celular só a inicial.** E-mail completo + "Meus projetos" + "Novo" não
 *   cabem em 390 px; o e-mail aparece dentro do menu, que é onde a pessoa vai
 *   olhar quando quiser confirmar em que conta está.
 * - **Sair não apaga rascunho.** `sair()` limpa só a sessão. O que está salvo
 *   (`estudio_dono`, pautas, projetos) fica: trocar de conta no mesmo navegador
 *   não deve apagar o trabalho de quem estava ali.
 * - **Sessão expirada não é logout silencioso.** Quem escuta o evento
 *   `ac:sessao-expirada` manda para `/login?expirado=1`, e o login explica o que
 *   aconteceu. O alvo faz o contrário: cai no muro de login sem dizer nada.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import {
  EVENTO_AUTH_INDISPONIVEL,
  EVENTO_SESSAO_EXPIRADA,
  carregarUsuario,
  sair,
  type UsuarioCarrossel,
} from "@/lib/auth/sessao";

const COR = {
  tinta: "#1C1917",
  secundario: "#57534E",
  fraco: "#A8A29E",
  borda: "#E7E5E4",
  laranja: "#F4511E",
  /** Laranja de ação: branco sobre #F4511E reprova AA; sobre #C2410C dá 5,18:1. */
  acao: "#C2410C",
  perigo: "#B91C1C",
};

const PAPEL: Record<UsuarioCarrossel["papel"], string> = {
  owner: "Dono da conta",
  admin: "Administrador",
  operador: "Operador",
};

export interface MenuContaProps {
  /** Usuário já carregado pela tela; omitido = o menu busca em `/me`. */
  usuario?: UsuarioCarrossel | null;
}

export function MenuConta({ usuario: usuarioInicial }: MenuContaProps = {}) {
  const router = useRouter();
  const caminho = usePathname() ?? "/";
  const [usuario, setUsuario] = useState<UsuarioCarrossel | null>(usuarioInicial ?? null);
  const [aberto, setAberto] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const caixa = useRef<HTMLDivElement | null>(null);

  // Identidade: uma leitura por montagem. Falha aqui não é erro de tela — o menu
  // continua funcionando com a inicial genérica e o "Sair" disponível.
  useEffect(() => {
    if (usuarioInicial !== undefined) return;
    let vivo = true;
    void carregarUsuario().then((u) => {
      if (vivo) setUsuario(u);
    });
    return () => {
      vivo = false;
    };
  }, [usuarioInicial]);

  // Sessão vencida: explicar no login, não sumir. `sair()` já limpou a sessão em
  // `apiFetch`; aqui só resta levar a pessoa ao lugar certo com o motivo.
  useEffect(() => {
    const aoExpirar = () => {
      const de = encodeURIComponent(caminho);
      router.replace(`/login?expirado=1&de=${de}`);
    };
    const aoFicarSemAuth = () => {
      setAviso("Não conseguimos falar com o serviço de login. Sua sessão continua — tente de novo em instantes.");
    };
    window.addEventListener(EVENTO_SESSAO_EXPIRADA, aoExpirar);
    window.addEventListener(EVENTO_AUTH_INDISPONIVEL, aoFicarSemAuth);
    return () => {
      window.removeEventListener(EVENTO_SESSAO_EXPIRADA, aoExpirar);
      window.removeEventListener(EVENTO_AUTH_INDISPONIVEL, aoFicarSemAuth);
    };
  }, [caminho, router]);

  // Aviso é temporário: some sozinho para não virar faixa permanente.
  useEffect(() => {
    if (!aviso) return;
    const t = setTimeout(() => setAviso(null), 8000);
    return () => clearTimeout(t);
  }, [aviso]);

  const fechar = useCallback(() => setAberto(false), []);

  // Clique fora e Esc: o menu não pode virar armadilha em tela pequena.
  useEffect(() => {
    if (!aberto) return;
    const aoClicar = (e: MouseEvent) => {
      if (caixa.current && !caixa.current.contains(e.target as Node)) fechar();
    };
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key === "Escape") fechar();
    };
    document.addEventListener("mousedown", aoClicar);
    document.addEventListener("keydown", aoTeclar);
    return () => {
      document.removeEventListener("mousedown", aoClicar);
      document.removeEventListener("keydown", aoTeclar);
    };
  }, [aberto, fechar]);

  const aoSair = useCallback(() => {
    sair();
    setAberto(false);
    // `replace` e não `push`: voltar pelo botão do navegador não pode reabrir a
    // tela de quem acabou de sair.
    router.replace("/login?saiu=1");
    router.refresh();
  }, [router]);

  const inicial = (usuario?.nome?.trim()?.[0] ?? usuario?.email?.[0] ?? "?").toUpperCase();
  const rotulo = usuario?.email ? `Conta de ${usuario.email}` : "Sua conta";

  return (
    <div className="relative" ref={caixa}>
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={aberto}
        aria-label={rotulo}
        className="flex min-h-11 items-center gap-2 rounded-lg px-1.5 py-1 text-[13px] font-semibold sm:min-h-0 sm:px-2 sm:py-1.5"
        style={{ color: COR.tinta, border: `1px solid ${COR.borda}`, backgroundColor: "#fff" }}
      >
        <span
          aria-hidden="true"
          className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-[12px] font-bold text-white"
          style={{ backgroundColor: COR.laranja }}
        >
          {inicial}
        </span>
        <span className="hidden max-w-[150px] truncate sm:inline" style={{ color: COR.secundario }}>
          {usuario?.email ?? "Sua conta"}
        </span>
        <svg
          aria-hidden="true"
          width="10"
          height="10"
          viewBox="0 0 10 10"
          fill="none"
          className="hidden sm:block"
        >
          <path
            d="M2 4l3 3 3-3"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {aberto ? (
        <div
          role="menu"
          aria-label="Conta"
          className="absolute right-0 top-full z-30 mt-2 w-[264px] overflow-hidden rounded-xl bg-white text-left shadow-lg"
          style={{ border: `1px solid ${COR.borda}` }}
        >
          <div className="px-4 py-3" style={{ borderBottom: `1px solid ${COR.borda}` }}>
            {usuario?.nome ? (
              <p className="truncate text-[13px] font-semibold" style={{ color: COR.tinta }}>
                {usuario.nome}
              </p>
            ) : null}
            <p className="truncate text-[12px]" style={{ color: COR.secundario }}>
              {usuario?.email ?? "Conta sem identificação carregada"}
            </p>
            <p className="mt-1 text-[11px] font-semibold uppercase tracking-wide" style={{ color: COR.acao }}>
              {usuario ? PAPEL[usuario.papel] ?? "Conta" : "Sessão ativa"}
            </p>
          </div>

          <Link
            role="menuitem"
            href="/projetos"
            onClick={fechar}
            className="flex min-h-11 items-center px-4 text-[13px] font-semibold hover:bg-[#F5F4F1]"
            style={{ color: COR.tinta }}
          >
            Meus projetos
          </Link>
          <Link
            role="menuitem"
            href="/configuracoes"
            onClick={fechar}
            className="flex min-h-11 items-center px-4 text-[13px] font-semibold hover:bg-[#F5F4F1]"
            style={{ color: COR.tinta }}
          >
            Configurações
          </Link>

          <div className="p-2" style={{ borderTop: `1px solid ${COR.borda}` }}>
            <button
              type="button"
              role="menuitem"
              onClick={aoSair}
              className="flex min-h-11 w-full items-center justify-center rounded-lg px-3 text-[13px] font-semibold hover:bg-[#FEF2F2]"
              style={{ color: COR.perigo, border: `1px solid ${COR.borda}` }}
            >
              Sair da conta
            </button>
          </div>
        </div>
      ) : null}

      {aviso ? (
        <p
          role="status"
          className="fixed bottom-4 left-1/2 z-40 w-[min(92vw,420px)] -translate-x-1/2 rounded-xl px-3 py-2 text-[13px] shadow-lg"
          style={{ backgroundColor: "#FFFBEB", color: "#92400E", border: "1px solid #FCD34D" }}
        >
          {aviso}
        </p>
      ) : null}
    </div>
  );
}
