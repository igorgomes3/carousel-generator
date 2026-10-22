"use client";

import React, { createContext, useContext, useState } from "react";
import type { ResultadoConteudo } from "@/lib/conteudo";

/**
 * Guarda o material de estratégia da última geração.
 *
 * Vive em contexto, não no formulário do documento: o plano é resultado da
 * geração, não parte do carrossel. Se fosse para o documento, ele seria salvo
 * no localStorage e viajaria junto com o carrossel — e um plano de outra sessão
 * não descreve este carrossel.
 */
interface PlanoContextValue {
  plano: ResultadoConteudo | null;
  setPlano: (p: ResultadoConteudo | null) => void;
}

const PlanoContext = createContext<PlanoContextValue | undefined>(undefined);

export function PlanoProvider({ children }: { children: React.ReactNode }) {
  const [plano, setPlano] = useState<ResultadoConteudo | null>(null);
  return (
    <PlanoContext.Provider value={{ plano, setPlano }}>
      {children}
    </PlanoContext.Provider>
  );
}

export function usePlanoContext(): PlanoContextValue {
  const ctx = useContext(PlanoContext);
  if (!ctx) {
    throw new Error("usePlanoContext precisa estar dentro de PlanoProvider");
  }
  return ctx;
}
