/**
 * @ do perfil — o que aparece no card e o que vai para o PNG (issue #12).
 *
 * O alvo trata o @ como identidade da marca: sem ele o card bonito é anônimo e
 * não devolve seguidor. Aqui ele é UM campo do projeto, não um elemento por
 * card — repetir o @ em dez cards separados é o tipo de edição que a pessoa
 * esquece em um e o carrossel sai com dois handles.
 *
 * ## Duas funções e não uma
 *
 * `limparArroba` é para DIGITAR: aceita "@perfil", "perfil", "@@perfil", " @perfil "
 * e devolve o que deve aparecer na tela ("perfil", com o @ aplicado por quem
 * desenha). `normalizarArroba` é para GRAVAR: aplica a regra do Instagram
 * (letras, números, ponto e sublinhado, máximo 30) e devolve `null` quando não
 * sobra nada — `null` e não `""` porque "não tem @ escolhido" e "@" vazio são a
 * mesma coisa no disco e não deveriam virar dois estados diferentes.
 */

/** Limite real do Instagram para nome de usuário. */
export const LIMITE_ARROBA = 30;

const PERMITIDOS = /[^a-zA-Z0-9._]/g;

/**
 * O que a pessoa digitou → o que o card mostra (sem `@`, sem lixo).
 *
 * Não corta em 30 aqui: enquanto digita, cortar no meio é hostil. O corte
 * acontece na gravação e o `maxLength` do input segura o resto.
 */
export function limparArroba(entrada: string | null | undefined): string {
  if (typeof entrada !== "string") return "";
  return entrada.replace(/^[@\s]+/, "").replace(/\s+/g, "").replace(PERMITIDOS, "");
}

/** Versão com `@` para desenhar. Sem handle, devolve string vazia (não "[@]"). */
export function arrobaVisivel(entrada: string | null | undefined): string {
  const limpo = limparArroba(entrada);
  return limpo ? `@${limpo}` : "";
}

/**
 * Versão para o disco: regra do Instagram aplicada, `null` quando vazio.
 *
 * Ponto no começo ou no fim, e dois pontos seguidos, são inválidos no Instagram
 * — o campo aceita porque é o que a pessoa digita, e a gravação descarta. Não
 * avisamos: o @ não é caminho crítico do carrossel, e um erro vermelho por causa
 * dele só assusta quem está tentando baixar os PNGs.
 */
export function normalizarArroba(entrada: unknown): string | null {
  if (typeof entrada !== "string") return null;
  const limpo = limparArroba(entrada)
    .replace(/\.{2,}/g, ".")
    .replace(/^[.]+/, "")
    .replace(/[.]+$/, "")
    .slice(0, LIMITE_ARROBA)
    .replace(/[.]+$/, "");
  return limpo || null;
}
