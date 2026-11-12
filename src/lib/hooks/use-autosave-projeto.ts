"use client";

/**
 * Autosave do carrossel.
 *
 * Regras que evitam os dois extremos ruins:
 *   - salvar a cada tecla martela a API e cria versão por besteira (o servidor
 *     já ignora conteúdo igual, mas nem vale mandar);
 *   - salvar só no botão perde trabalho quando a aba fecha.
 *
 * Então: debounce de 1,2s após a última alteração, sem sobreposição (nunca dois
 * PATCH em voo), e um flush quando a aba fica oculta.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import type { DocumentFormReturn } from "@/lib/document-form-types";
import { apiJson } from "@/lib/auth/sessao";

export type EstadoSalvamento = "ocioso" | "salvando" | "salvo" | "erro";

const ESPERA_MS = 1200;

export function useAutosaveProjeto(
  form: DocumentFormReturn,
  projetoId: string | null,
  tituloInicial: string,
) {
  const [estado, setEstado] = useState<EstadoSalvamento>("ocioso");
  const [erro, setErro] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const emVoo = useRef(false);
  const pendente = useRef(false);
  const titulo = useRef(tituloInicial);

  const salvar = useCallback(async () => {
    if (!projetoId) return;
    if (emVoo.current) {
      pendente.current = true;
      return;
    }
    emVoo.current = true;
    setEstado("salvando");
    try {
      await apiJson(`/carrossel/carrosseis/${projetoId}?org=autoclinic`, {
        method: "PATCH",
        body: JSON.stringify({ documento: form.getValues(), titulo: titulo.current }),
      });
      setEstado("salvo");
      setErro(null);
    } catch (e) {
      setEstado("erro");
      setErro(e instanceof Error ? e.message : "Falha ao salvar");
    } finally {
      emVoo.current = false;
      if (pendente.current) {
        pendente.current = false;
        void salvar();
      }
    }
  }, [form, projetoId]);

  const agendar = useCallback(() => {
    if (!projetoId) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => void salvar(), ESPERA_MS);
  }, [projetoId, salvar]);

  useEffect(() => {
    if (!projetoId) return;
    const cancelar = form.watch(() => agendar());
    return () => {
      cancelar?.unsubscribe?.();
      if (timer.current) clearTimeout(timer.current);
    };
  }, [form, projetoId, agendar]);

  // Aba escondida/fechando: salva o que estiver pendente. `visibilitychange` é o
  // último evento confiável em mobile; beforeunload não dispara sempre.
  useEffect(() => {
    if (!projetoId) return;
    const aoEsconder = () => {
      if (document.visibilityState === "hidden") void salvar();
    };
    document.addEventListener("visibilitychange", aoEsconder);
    return () => document.removeEventListener("visibilitychange", aoEsconder);
  }, [projetoId, salvar]);

  return { estado, erro, salvarAgora: salvar, definirTitulo: (t: string) => (titulo.current = t) };
}
