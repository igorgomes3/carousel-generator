/**
 * Mensagem de falha de login (issue #19) — o que a pessoa lê quando erra.
 *
 * Roda sem navegador: `npx tsx src/lib/auth/mensagens.test.ts`
 *
 * O que vale provar aqui, e por que:
 *
 * 1. **Conta inexistente e senha errada não se distinguem.** Se distinguissem, a
 *    tela de login viraria um verificador de "quem tem conta" — um problema de
 *    privacidade que ninguém percebe até alguém usar.
 * 2. **Nenhuma frase sai em inglês.** O GoTrue responde `Invalid login
 *    credentials`; isso já vazou para a tela antes.
 * 3. **O status separa corrigir a credencial de esperar de "fora do ar".** É o
 *    que o front usa para decidir entre mostrar o erro no formulário e avisar
 *    que o serviço de login não respondeu.
 */
import { ERRO_CREDENCIAL, ERRO_SERVICO_FORA, mensagemDeFalhaDeLogin } from "./mensagens";

let falhas = 0;

function ok(nome: string, condicao: boolean, detalhe = "") {
  if (condicao) {
    console.log(`  ok   ${nome}`);
    return;
  }
  falhas += 1;
  console.log(`  FALHA ${nome}${detalhe ? ` — ${detalhe}` : ""}`);
}

/** Nenhum texto devolvido pode ser o inglês do provedor. */
function semIngles(frase: string): boolean {
  return !/invalid|credentials|confirmed|rate limit|password should|unable to/i.test(frase);
}

console.log("mensagens de falha de login");

// --- credencial errada (os dois formatos que o GoTrue usa) -------------------
const senhaErrada = mensagemDeFalhaDeLogin(400, {
  code: "invalid_credentials",
  message: "Invalid login credentials",
});
ok("senha errada → frase única", senhaErrada.erro === ERRO_CREDENCIAL, senhaErrada.erro);
ok("senha errada → 401", senhaErrada.status === 401, String(senhaErrada.status));

const contaInexistente = mensagemDeFalhaDeLogin(400, { error: "invalid_grant", error_description: "Invalid login credentials" });
const semConfirmarCurto = mensagemDeFalhaDeLogin(400, { msg: "User not found" });
ok(
  "conta inexistente diz o mesmo que senha errada",
  contaInexistente.erro === senhaErrada.erro && semConfirmarCurto.erro === senhaErrada.erro,
  [contaInexistente.erro, semConfirmarCurto.erro].join(" | "),
);

// --- e-mail não confirmado --------------------------------------------------
const naoConfirmado = mensagemDeFalhaDeLogin(400, { code: "email_not_confirmed", message: "Email not confirmed" });
ok("e-mail não confirmado explica o próximo passo", /confirmar seu e-mail/i.test(naoConfirmado.erro), naoConfirmado.erro);
ok("e-mail não confirmado não é inglês", semIngles(naoConfirmado.erro), naoConfirmado.erro);
ok(
  "e-mail não confirmado NÃO se confunde com senha errada",
  naoConfirmado.erro !== ERRO_CREDENCIAL && naoConfirmado.erro !== ERRO_SERVICO_FORA,
  naoConfirmado.erro,
);

// --- limite de envio de e-mail ---------------------------------------------
const limite = mensagemDeFalhaDeLogin(429, { code: "over_email_send_rate_limit", message: "Email rate limit exceeded" });
ok("limite vira 'espere um minuto'", /espere um minuto/i.test(limite.erro), limite.erro);
ok("limite → 429", limite.status === 429, String(limite.status));

// --- senha curta ------------------------------------------------------------
const curta = mensagemDeFalhaDeLogin(422, { code: "weak_password", message: "Password should be at least 6 characters" });
ok("senha curta diz o mínimo", /6 caracteres/.test(curta.erro), curta.erro);
ok("senha curta → 400", curta.status === 400, String(curta.status));

// --- e-mail malformado ------------------------------------------------------
const emailRuim = mensagemDeFalhaDeLogin(400, { message: "Unable to validate email address: invalid format" });
ok("e-mail malformado aponta o campo", /e-mail/i.test(emailRuim.erro), emailRuim.erro);

// --- falha do serviço -------------------------------------------------------
const fora = mensagemDeFalhaDeLogin(503, { message: "upstream connect error" });
ok("5xx do auth → serviço fora", fora.erro === ERRO_SERVICO_FORA, fora.erro);
ok("5xx do auth → 502", fora.status === 502, String(fora.status));

// --- corpo que nem é objeto -------------------------------------------------
const vazio = mensagemDeFalhaDeLogin(400, undefined);
ok("corpo vazio ainda responde em português", vazio.erro === ERRO_CREDENCIAL && semIngles(vazio.erro), vazio.erro);

const estranho = mensagemDeFalhaDeLogin(500, "erro em texto puro");
ok("500 sem corpo reconhecido → serviço fora", estranho.erro === ERRO_SERVICO_FORA, estranho.erro);

// --- nenhuma frase carrega inglês ------------------------------------------
for (const [rotulo, r] of Object.entries({ senhaErrada, naoConfirmado, limite, curta, emailRuim, fora })) {
  ok(`sem inglês: ${rotulo}`, semIngles(r.erro), r.erro);
}

if (falhas > 0) {
  console.error(`\n${falhas} falha(s)`);
  process.exit(1);
}
console.log("\ntudo certo");
