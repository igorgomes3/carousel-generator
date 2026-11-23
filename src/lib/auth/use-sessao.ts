"use client";

/**
 * A sessão como estado de tela: `carregando | logado | deslogado`.
 *
 * Por que um hook e não o cookie no servidor: o estúdio é uma página de cliente
 * e a tela precisa esconder/desabilitar geração **antes** do clique. O
 * middleware já barra a navegação, mas um botão que aceita o clique e responde
 * 401 é pior que um botão desligado com o motivo na frente.
 *
 * O estado é derivado de uma chamada real (`/api/auth/eu` via `renovar()` +
 * `carregarUsuario()`), não da presença do cookie: cookie marcador forjado não
 * vale como sessão aqui.
 */
import { useCallback, useEffect, useState } from "react";

import {
  EVENTO_SESSAO_EXPIRADA,
  carregarUsuario,
  renovar,
  usuarioAtual,
  type UsuarioCarrossel,
} from "@/lib/auth/sessao";

export type EstadoSessao = "carregando" | "logado" | "deslogado";

export interface SessaoDaTela {
  estado: EstadoSessao;
  usuario: UsuarioCarrossel | null;
  /** Reconsulta o servidor (usado depois de entrar numa aba e voltar). */
  recarregar: () => void;
}

export function useSessao(): SessaoDaTela {
  const [estado, setEstado] = useState<EstadoSessao>(() =>
    usuarioAtual() ? "logado" : "carregando",
  );
  const [usuario, setUsuario] = useState<UsuarioCarrossel | null>(() => usuarioAtual());
  const [ciclo, setCiclo] = useState(0);

  useEffect(() => {
    let vivo = true;
    (async () => {
      const atual = usuarioAtual() ?? (await carregarUsuario());
      if (atual) {
        if (!vivo) return;
        setUsuario(atual);
        setEstado("logado");
        return;
      }
      const resultado = await renovar();
      const depois = resultado === "ok" ? await carregarUsuario() : null;
      if (!vivo) return;
      setUsuario(depois);
      setEstado(depois ? "logado" : "deslogado");
    })();
    return () => {
      vivo = false;
    };
  }, [ciclo]);

  useEffect(() => {
    const aoExpirar = () => {
      setUsuario(null);
      setEstado("deslogado");
    };
    window.addEventListener(EVENTO_SESSAO_EXPIRADA, aoExpirar);
    return () => window.removeEventListener(EVENTO_SESSAO_EXPIRADA, aoExpirar);
  }, []);

  const recarregar = useCallback(() => {
    setEstado("carregando");
    setCiclo((n) => n + 1);
  }, []);

  return { estado, usuario, recarregar };
}
