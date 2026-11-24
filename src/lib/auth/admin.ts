/**
 * Quem administra o produto.
 *
 * Não existe papel no banco: a lista vive em `CARROSSEL_ADMINS` (e-mails
 * separados por vírgula), com um padrão embutido para o dono não ficar trancado
 * fora se a variável sumir do `.env`. Duas fontes de verdade para a mesma
 * pergunta é o que produz "sou admin em um lugar e não no outro", então a regra
 * é só esta função.
 *
 * Comparação em minúsculas: e-mail não é case-sensitive na prática, e negar
 * acesso a `Igor@…` porque foi digitado com maiúscula é bug de operação.
 */
const PADRAO = "igorgomes@mail.com";

export function emailsAdmin(): string[] {
  const bruto = process.env.CARROSSEL_ADMINS?.trim() || PADRAO;
  return bruto
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function ehAdmin(email: string | null | undefined): boolean {
  if (!email) return false;
  return emailsAdmin().includes(email.trim().toLowerCase());
}
