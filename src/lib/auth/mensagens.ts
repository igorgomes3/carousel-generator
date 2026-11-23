/**
 * Falha de login em português de gente.
 *
 * O GoTrue responde em inglês técnico (`Invalid login credentials`,
 * `Email not confirmed`, `over_email_send_rate_limit`). Até aqui o route handler
 * repassava esse texto cru para a tela em tudo que não fosse 400/401 — quem
 * digitasse a senha certa numa conta não confirmada lia "Email not confirmed" e
 * não sabia o que fazer. O usuário deste produto é leigo: a mensagem tem que
 * dizer o próximo passo, não o nome do erro.
 *
 * Regras que este arquivo garante:
 *
 * 1. **Credencial errada não revela se a conta existe.** Conta inexistente e
 *    senha errada produzem a MESMA frase — senão a tela de login vira um oráculo
 *    de "quais e-mails têm conta aqui".
 * 2. **Nada de inglês na tela.** Se o erro não for reconhecido, a resposta é uma
 *    frase genérica em português; a mensagem original fica só no servidor.
 * 3. **O status importa para o cliente.** `401` manda a pessoa corrigir a
 *    credencial; `429` pede espera; `502` é "o serviço de login está fora" — e o
 *    front não deve tratar os três como "senha errada".
 */
export interface FalhaDeLogin {
  /** Frase pronta para a tela. */
  erro: string;
  /** Status HTTP que o route handler devolve. */
  status: number;
}

/** A frase única de credencial errada (não diferencia e-mail de senha). */
export const ERRO_CREDENCIAL = "E-mail ou senha incorretos.";

/** Falha que não é culpa de quem digitou: o hop até o auth não respondeu. */
export const ERRO_SERVICO_FORA = "Não foi possível entrar agora. O serviço de login não respondeu — tente de novo em instantes.";

/** O que o GoTrue devolve, resumido nos campos que carregam texto. */
interface CorpoDoAuth {
  code?: string;
  error?: string;
  error_code?: string;
  error_description?: string;
  msg?: string;
  message?: string;
}

/** Todo o texto do corpo, minúsculo, num só lugar para casar por trecho. */
function textoDoCorpo(corpo: unknown): string {
  if (!corpo || typeof corpo !== "object") return "";
  const c = corpo as CorpoDoAuth;
  return [c.code, c.error, c.error_code, c.error_description, c.msg, c.message]
    .filter((v): v is string => typeof v === "string")
    .join(" ")
    .toLowerCase();
}

/**
 * Traduz a resposta do GoTrue numa frase acionável.
 *
 * `status` é o status que o auth devolveu (ou 502 quando nem houve resposta).
 */
export function mensagemDeFalhaDeLogin(status: number, corpo: unknown): FalhaDeLogin {
  const texto = textoDoCorpo(corpo);

  // Conta inexistente cai aqui também: mesma frase, mesmo status, sem oráculo.
  if (/invalid login|invalid_credentials|invalid grant|user not found/.test(texto)) {
    return { erro: ERRO_CREDENCIAL, status: 401 };
  }

  if (/email not confirmed|not confirmed|confirm your email/.test(texto)) {
    return {
      erro: "Falta confirmar seu e-mail. Abra o link que enviamos para a sua caixa de entrada (olhe também o spam).",
      status: 401,
    };
  }

  if (/rate limit|over_email_send|too many requests|email rate/.test(texto)) {
    return {
      erro: "Muitas tentativas seguidas. Espere um minuto e tente de novo.",
      status: 429,
    };
  }

  if (/weak password|password should be|password.*(short|length)/.test(texto)) {
    return { erro: "A senha precisa ter 6 caracteres ou mais.", status: 400 };
  }

  if (/missing email|email.*required|invalid email|unable to validate email/.test(texto)) {
    return { erro: "Confira o e-mail: parece que falta algo nele.", status: 400 };
  }

  // 400/401 sem texto reconhecido: quase sempre é credencial. Mantém a frase
  // segura em vez de inventar diagnóstico.
  if (status === 400 || status === 401) return { erro: ERRO_CREDENCIAL, status: 401 };

  // 5xx do auth, ou status estranho: o problema não está no que a pessoa digitou.
  return { erro: ERRO_SERVICO_FORA, status: 502 };
}
