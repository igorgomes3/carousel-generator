/**
 * Quem é o dono dos projetos.
 *
 * O estúdio não tem login (o leigo chega em `/` e cria). Para a lista "Meus
 * projetos" não virar "projetos de todo mundo", cada navegador ganha uma
 * identidade anônima: cookie `estudio_dono`, httpOnly, um ano. É o mínimo que
 * separa uma pessoa da outra sem pedir e-mail e senha para gerar um carrossel.
 *
 * Limite conhecido e assumido: trocar de navegador (ou limpar cookies) perde a
 * lista, porque a identidade vive no cookie. Isso está na seção "pendências" do
 * relatório da issue #13 — o passo seguinte é vincular ao GoTrue que já existe
 * em `/login`, sem tornar o login obrigatório para criar.
 */
import crypto from "node:crypto";
import { cookies } from "next/headers";

const COOKIE = "estudio_dono";
const UM_ANO = 60 * 60 * 24 * 365;
const RE_DONO = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/** Dono já existente, ou null se este navegador nunca salvou nada. */
export function donoAtual(): string | null {
  const valor = cookies().get(COOKIE)?.value;
  return valor && RE_DONO.test(valor) ? valor : null;
}

/**
 * Dono da requisição, criando o cookie quando ele ainda não existe.
 *
 * `secure: false` é de propósito: o app roda em http na tailnet e um cookie
 * `secure` simplesmente não seria gravado — o sintoma seria "salva e some",
 * exatamente o que esta issue existe para resolver.
 */
export function garantirDono(): string {
  const existente = donoAtual();
  if (existente) return existente;

  const novo = crypto.randomUUID();
  cookies().set(COOKIE, novo, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: UM_ANO,
    secure: false,
  });
  return novo;
}
