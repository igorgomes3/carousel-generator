"use client";

/**
 * `/manutencao` — o que a pessoa vê quando o produto está em manutenção.
 *
 * Existe porque derrubar a entrada com erro de servidor é pior que avisar: quem
 * chegou pelo link do Instagram precisa entender que o serviço volta, e não que
 * o produto morreu. A página é pública (o middleware a libera) e não tem login.
 */
const COR = {
  tinta: "#0B1220",
  suave: "#475467",
  fraco: "#475467",
  acao: "#0E7490",
  fundo: "#F5F7F9",
  borda: "#E2E8F0",
};

export default function ManutencaoPage() {
  return (
    <main
      className="grid min-h-screen w-full place-items-center px-4"
      style={{ backgroundColor: COR.fundo }}
    >
      <div
        className="w-full max-w-[520px] rounded-2xl bg-white p-6 sm:p-8"
        style={{ border: `1px solid ${COR.borda}` }}
      >
        <div className="flex items-center gap-2">
          <span
            aria-hidden="true"
            className="grid h-9 w-9 place-items-center rounded-lg text-[16px] font-bold text-white"
            style={{ backgroundColor: COR.acao }}
          >
            X
          </span>
          <span className="text-[17px] font-bold tracking-tight" style={{ color: COR.tinta }}>
            CONTENT<span style={{ color: COR.acao }}>X</span>
          </span>
        </div>

        <h1 className="mt-6 text-[24px] font-bold leading-tight" style={{ color: COR.tinta }}>
          Estamos em manutenção
        </h1>
        <p className="mt-2 text-[15px] leading-relaxed" style={{ color: COR.suave }}>
          O acesso está temporariamente desligado para uma atualização. Nada do que
          você já criou foi perdido — volta assim que terminarmos.
        </p>

        <div
          className="mt-5 rounded-xl px-4 py-3 text-[13px]"
          style={{ backgroundColor: "#ECFEFF", color: COR.acao, border: "1px solid #A5F3FC" }}
        >
          Previsão: voltamos ainda hoje. Se precisar falar com a gente, responda a
          mensagem por onde você recebeu este link.
        </div>

        <button
          type="button"
          onClick={() => window.location.reload()}
          className="mt-6 min-h-[44px] w-full rounded-xl px-4 py-2.5 text-[14px] font-semibold text-white"
          style={{ backgroundColor: COR.acao }}
        >
          Atualizar página
        </button>

        <p className="mt-4 text-center text-[12px]" style={{ color: COR.fraco }}>
          CONTENTX · gerador de carrossel
        </p>
      </div>
    </main>
  );
}
