"use client";

/**
 * Estado de salvamento visível na barra do palco.
 *
 * Por que um contexto: o `useAutosaveProjeto` vive dentro do DocumentProvider e
 * a linha de status fica na barra do palco, três componentes abaixo. Passar por
 * props atravessaria Editor → SlidesEditor → barra sem que nenhum dos dois
 * intermediários tenha o que fazer com o dado.
 *
 * O texto é honesto sobre onde o documento está: em modo projeto o banco é a
 * fonte ("Salvo automaticamente"), no editor novo a fonte é o navegador
 * ("Salvo neste navegador"). Prometer "salvo" no modo local seria mentira: fechar
 * a aba e limpar o cache apaga o trabalho.
 */
import React, { useContext } from "react";

/**
 * Estado do salvamento do documento aberto.
 *
 * `ocioso` entrou com a W97: o editor antigo que este contexto servia foi
 * desligado (a rota redireciona para o estúdio) e a única superfície que sobrou
 * é o link público `/p/<token>`, que é somente leitura. Antes o tipo vinha de
 * `use-autosave-projeto` — o hook que gravava no AutoClinic e que foi removido
 * junto com `/api/ac/*`.
 */
export type EstadoSalvamento = "ocioso" | "limpo" | "sujo" | "salvando" | "erro";

export interface SalvamentoContextValue {
  estado: EstadoSalvamento;
  erro: string | null;
  titulo: string;
  /** `null` = editor novo (localStorage), sem projeto no banco. */
  projetoId: string | null;
}

const SalvamentoContext = React.createContext<SalvamentoContextValue | undefined>(
  undefined
);

export function SalvamentoProvider({
  children,
  value,
}: {
  children: React.ReactNode;
  value: SalvamentoContextValue;
}) {
  return (
    <SalvamentoContext.Provider value={value}>
      {children}
    </SalvamentoContext.Provider>
  );
}

export function useSalvamento() {
  return useContext(SalvamentoContext);
}
