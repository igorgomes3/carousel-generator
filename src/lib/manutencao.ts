/**
 * Modo manutenção — desliga a entrada do produto sem derrubar o serviço.
 *
 * Por que existe: subir uma versão nova com a tela de login quebrada é pior que
 * avisar "estamos em manutenção". Aqui a porta fecha, mas o `next` continua de pé
 * (as páginas de manutenção, assets e o link público continuam servindo).
 *
 * Como liga e desliga: `MANUTENCAO_ATIVA=1` + `MANUTENCAO_HOSTS` no `.env.local`.
 * O valor é lido em tempo de build pelo middleware (runtime edge), então ligar
 * ou desligar exige rebuild — é o preço de não pagar round-trip ao banco em cada
 * requisição. `scripts/manutencao.sh on|off` faz edição + build + restart.
 *
 * Escopo por host: a manutenção vale para os hosts listados (padrão
 * `app.contentx.com.br`). O domínio antigo/rollback continua acessível, que é o
 * ponto de ter dois endereços.
 */

export const ROTA_MANUTENCAO = "/manutencao";

/** Rotas que continuam servindo mesmo em manutenção (assets e a própria página). */
const LIBERADAS = [
  /^\/manutencao/,
  /^\/_next\//,
  /^\/favicon/,
  /^\/opengraph-image/,
  // Link público é read-only e não passa por login: não há por que derrubar.
  /^\/p\//,
];

export function lerConfigManutencao(): { ativa: boolean; hosts: string[] } {
  const ativa = (process.env.MANUTENCAO_ATIVA ?? "").trim() === "1";
  const hosts = (process.env.MANUTENCAO_HOSTS ?? "app.contentx.com.br")
    .split(",")
    .map((h) => h.trim().toLowerCase())
    .filter(Boolean);
  return { ativa, hosts };
}

/** O host desta requisição está em manutenção? */
export function manutencaoNesteHost(host: string | null | undefined): boolean {
  const { ativa, hosts } = lerConfigManutencao();
  if (!ativa) return false;
  if (hosts.length === 0) return true;
  const limpo = (host ?? "").toLowerCase().split(":")[0];
  return hosts.includes(limpo);
}

/** Rota liberada durante a manutenção? */
export function rotaLiberadaNaManutencao(pathname: string): boolean {
  return LIBERADAS.some((r) => r.test(pathname));
}
