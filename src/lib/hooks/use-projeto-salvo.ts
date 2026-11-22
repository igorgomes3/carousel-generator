"use client";

/**
 * Salvar o projeto do estúdio — e não perder o que não foi salvo.
 *
 * Regra do produto (issue #13): salvamento **explícito**, com hora na tela
 * ("Salvo às 14:32") e uma trava para o caso de alguém fechar a aba antes de
 * salvar. Não é autosave: autosave mente quando falha, e aqui o usuário é
 * leigo — ele precisa saber que o clique de salvar aconteceu.
 *
 * O hook guarda três coisas: o id do projeto (nulo = nunca salvo), a hora do
 * último salvamento e se existe alteração pendente (`sujo`).
 */
import { useCallback, useState } from "react";

import type { CarrosselGerado } from "@/lib/estudio/tipos";
import type { ProjetoSalvo } from "@/lib/estudio/projetos";

export type EstadoSalvamento = "limpo" | "sujo" | "salvando" | "erro";

export interface UseProjetoSalvo {
  projetoId: string | null;
  salvoEm: string | null;
  estado: EstadoSalvamento;
  erro: string | null;
  /** Marca "tem alteração não salva" — chamado em qualquer edição de card. */
  marcarSujo: () => void;
  salvar: (dados: { carrossel: CarrosselGerado; tema: string }) => Promise<ProjetoSalvo | null>;
  /** Devolve o projeto do servidor, ou null quando não existe/é de outro. */
  abrir: (id: string) => Promise<ProjetoSalvo | null>;
  zerar: () => void;
}

export function useProjetoSalvo(): UseProjetoSalvo {
  const [projetoId, setProjetoId] = useState<string | null>(null);
  const [salvoEm, setSalvoEm] = useState<string | null>(null);
  const [estado, setEstado] = useState<EstadoSalvamento>("limpo");
  const [erro, setErro] = useState<string | null>(null);

  const marcarSujo = useCallback(() => {
    setEstado((atual) => (atual === "salvando" ? atual : "sujo"));
  }, []);

  const salvar = useCallback(
    async ({ carrossel, tema }: { carrossel: CarrosselGerado; tema: string }) => {
      setEstado("salvando");
      setErro(null);
      try {
        const corpo = {
          tema,
          templateId: carrossel.templateId,
          slides: carrossel.slides,
        };

        const res = await fetch(projetoId ? `/api/projetos/${projetoId}` : "/api/projetos", {
          method: projetoId ? "PATCH" : "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(corpo),
        });

        const dados = (await res.json().catch(() => ({}))) as {
          projeto?: ProjetoSalvo;
          erro?: string;
        };

        if (!res.ok || !dados.projeto) {
          // Projeto apagado em outra aba: em vez de morrer, cria de novo.
          if (res.status === 404 && projetoId) {
            setProjetoId(null);
            const res2 = await fetch("/api/projetos", {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify(corpo),
            });
            const dados2 = (await res2.json().catch(() => ({}))) as {
              projeto?: ProjetoSalvo;
              erro?: string;
            };
            if (!res2.ok || !dados2.projeto) {
              throw new Error(dados2.erro ?? "Não foi possível salvar agora.");
            }
            setProjetoId(dados2.projeto.id);
            setSalvoEm(dados2.projeto.salvoEm);
            setEstado("limpo");
            return dados2.projeto;
          }
          throw new Error(dados.erro ?? "Não foi possível salvar agora.");
        }

        setProjetoId(dados.projeto.id);
        setSalvoEm(dados.projeto.salvoEm);
        setEstado("limpo");
        return dados.projeto;
      } catch (e) {
        setErro(e instanceof Error ? e.message : "Não foi possível salvar agora.");
        setEstado("erro");
        return null;
      }
    },
    [projetoId],
  );

  const abrir = useCallback(async (id: string): Promise<ProjetoSalvo | null> => {
    try {
      const res = await fetch(`/api/projetos/${id}`, { headers: { accept: "application/json" } });
      if (!res.ok) return null;
      const dados = (await res.json()) as { projeto?: ProjetoSalvo };
      if (!dados.projeto) return null;

      // As imagens gravadas voltam como caminho (`/api/projetos/<id>/arquivos/…`),
      // que é exatamente o que o `Cartao` já aceita em `slide.imagem`.
      setProjetoId(dados.projeto.id);
      setSalvoEm(dados.projeto.salvoEm);
      setEstado("limpo");
      setErro(null);
      return dados.projeto;
    } catch {
      return null;
    }
  }, []);

  const zerar = useCallback(() => {
    setProjetoId(null);
    setSalvoEm(null);
    setEstado("limpo");
    setErro(null);
  }, []);

  return { projetoId, salvoEm, estado, erro, marcarSujo, salvar, abrir, zerar };
}
