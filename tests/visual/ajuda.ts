import type { Page } from "@playwright/test";

import documentoReal from "./fixtures/documento-real.json";
import documentoPadrao from "./fixtures/documento-padrao.json";

/**
 * Ajudantes dos testes visuais.
 *
 * Contexto que este arquivo resolve: o middleware do carrossel exige o cookie
 * `ac_sessao=1` para renderizar `/` e `/carrossel/<id>`, e a API do AutoClinic
 * não está disponível no ambiente de teste. Sem isso, todo teste caía em
 * `/login` e falhava por timeout — foi o estado encontrado ao começar a direção
 * A: 7 de 7 testes vermelhos, todos pelo mesmo motivo.
 *
 * O cookie é só o marcador de "tem sessão" (ver src/middleware.ts): não autoriza
 * nada, e a API é mockada rota a rota.
 *
 * O que mudou na fase 1: `/` deixou de ser o editor e virou a tela inicial de
 * carrosséis; o editor mora em `/carrossel/<id>/editar`. O mock da lista passou
 * a devolver o formato novo da API (`estado`, `estado_em`, `capa`), e o mock de
 * item único foi separado do mock de lista — antes o mesmo `includes` respondia
 * `{ carrosseis: [...] }` também para `GET /carrosseis/<id>`.
 */

export const COOKIE_SESSAO = { name: "ac_sessao", value: "1" };

/** Estado de sessão para o `storageState` do playwright.config.ts. */
export const estadoDeSessao = {
  cookies: ["127.0.0.1", "localhost"].map((dominio) => ({
    ...COOKIE_SESSAO,
    domain: dominio,
    path: "/",
    expires: Math.floor(Date.now() / 1000) + 86400,
    httpOnly: false,
    secure: false,
    sameSite: "Lax" as const,
  })),
  origins: [
    {
      origin: "http://127.0.0.1:8099",
      localStorage: [{ name: "ac_refresh", value: "refresh-de-teste" }],
    },
  ],
};

/** Id usado no editor e na ficha nos testes: fixo para o mock ser determinístico. */
export const ID_EDITOR = "7e7ded22-878b-4b4f-b18f-a7b891bb20b7";

/**
 * Documento do editor nos testes: uma peça REAL de 3 slides.
 *
 * Não é documento vazio de propósito. Com `slides: []` o zod recusa o
 * documento, o editor cai no `defaultValues` (fundo branco), e o critério 6
 * compara a miniatura com um branco que não é o slide do carrossel — passaria
 * por acidente, provando nada. O fixture veio do banco de produção com a marca
 * trocada por `MARCA_MOCK`, e é o mesmo documento que o mock da lista descreve
 * em `capa`.
 */
export const DOCUMENTO_MOCK = documentoReal;

/** Fundo do slide 1 — lido do fixture, nunca escrito à mão duas vezes. */
export const FUNDO_DO_SLIDE: string = documentoReal.config.theme.background;

const horas = (n: number) => new Date(Date.now() - n * 3_600_000).toISOString();

/**
 * Cinco carrosséis no formato da API em `cf717c1` + os campos opcionais que a
 * tela já sabe exibir quando existirem.
 *
 * Composição proposital para os critérios da §8.1:
 *   - 3 em `aguardando_aprovacao` + 2 em `aprovada` (critério 5);
 *   - o primeiro tem a palavra "exagero" SÓ na legenda (critério 7);
 *   - todos com `capa.fundo`, e o primeiro com o fundo do documento (critério 6).
 */
export const CARROSSEIS_MOCK = [
  {
    id: "a1",
    titulo: "Fiscalização na estética: 7 pontos que a Vigilância olha antes de autuar",
    estado: "aguardando_aprovacao",
    estado_em: horas(2),
    atualizado_em: horas(2),
    criado_em: horas(30),
    versao_atual: 4,
    slides: 7,
    publico_ativo: true,
    publico_token: "oTP_vMjRKhPePTbZa6t2fw",
    capa: {
      titulo: "Fiscalização na estética",
      fundo: FUNDO_DO_SLIDE,
      cor_texto: "#141414",
      slides: 7,
    },
    legenda: "Protocolo de avaliação antes da aplicação. Nada de exagero no primeiro contato.",
    hashtags: ["#estetica", "#vigilancia"],
    fotos: 2,
    pauta_titulo: "Vigilância sanitária aperta o cerco em clínicas de estética",
  },
  {
    id: "a2",
    titulo: "Harmonização facial: o que muda com a nova regra da Anvisa",
    estado: "aguardando_aprovacao",
    estado_em: horas(26),
    atualizado_em: horas(26),
    criado_em: horas(40),
    versao_atual: 2,
    slides: 6,
    publico_ativo: false,
    capa: { titulo: "Harmonização facial", fundo: "#123B32", cor_texto: "#ffffff", slides: 6 },
    legenda: null,
    hashtags: [],
    fotos: 0,
    pauta_titulo: null,
  },
  {
    id: "a3",
    titulo: "Precificação de protocolo: como parar de perder margem",
    estado: "aguardando_aprovacao",
    estado_em: horas(50),
    atualizado_em: horas(50),
    criado_em: horas(70),
    versao_atual: 1,
    slides: 5,
    publico_ativo: false,
    capa: { titulo: "Precificação de protocolo", fundo: "#242743", cor_texto: "#ffffff", slides: 5 },
    legenda: null,
    hashtags: [],
    fotos: 0,
    pauta_titulo: null,
  },
  {
    id: "b1",
    titulo: "Anamnese que evita processo",
    estado: "aprovada",
    estado_em: horas(4),
    atualizado_em: horas(4),
    criado_em: horas(80),
    versao_atual: 3,
    slides: 8,
    publico_ativo: false,
    capa: {
      titulo: "Anamnese que evita processo",
      fundo: "#3A2A1B",
      cor_texto: "#ffffff",
      slides: 8,
    },
    legenda: null,
    hashtags: [],
    fotos: 0,
    pauta_titulo: null,
  },
  {
    id: "b2",
    titulo: "O erro de agenda que custa 12% do faturamento",
    estado: "aprovada",
    estado_em: horas(9),
    atualizado_em: horas(9),
    criado_em: horas(100),
    versao_atual: 2,
    slides: 6,
    publico_ativo: false,
    capa: { titulo: "O erro de agenda", fundo: "#1B2532", cor_texto: "#ffffff", slides: 6 },
    legenda: null,
    hashtags: [],
    fotos: 0,
    pauta_titulo: null,
  },
];

/**
 * Marca da organização que a API mockada devolve.
 *
 * Não é enfeite: o editor novo semeia nome e @ daqui, e o slide tem que sair com
 * ela — é a prova de que a marca deixou de vir do `defaultValues`.
 */
export const MARCA_MOCK = { nome: "Clínica Aurora", handle: "@clinicaaurora", avatar_url: null };

export interface OpcoesMock {
  /** Lista que a API devolve. Padrão: `CARROSSEIS_MOCK`. */
  carrosseis?: unknown[];
  /** Marca da organização; `null` devolve marca vazia. */
  marca?: typeof MARCA_MOCK | null;
  /** Resposta de `POST /carrosseis/aprovar` (ação em lote). */
  aprovacao?: { status: number; corpo: unknown } | null;
  /** Resposta de `POST /carrosseis/<id>/gerar` — o critério 8 usa 409. */
  geracao?: { status: number; corpo: unknown } | null;
  /**
   * Documento que o `GET /carrosseis/<id>` devolve.
   * `null` = carrossel SEM `documento`, que é como os testes de editor medem o
   * documento padrão (`defaultValues`): o zod recusa `undefined` e o editor cai
   * no padrão, exatamente como o editor "novo" da direção A fazia.
   */
  documento?: unknown | null;
}

const ID_NA_ROTA = /\/carrossel\/carrosseis\/([0-9a-f-]{36})(?:\/|$|\?)/;

/** Sessão + API mockada. Chamar ANTES do `goto`. */
export async function prepararSessao(page: Page, opcoes: OpcoesMock = {}) {
  const carrosseis = opcoes.carrosseis ?? CARROSSEIS_MOCK;
  const marca = opcoes.marca === undefined ? MARCA_MOCK : opcoes.marca;
  const documento = opcoes.documento === undefined ? DOCUMENTO_MOCK : opcoes.documento;

  await page.route("**/api/auth/refresh", (rota) =>
    rota.fulfill({
      json: { access_token: "token-de-teste", refresh_token: "refresh-de-teste" },
    }),
  );

  await page.route("**/api/ac/**", (rota) => {
    const url = rota.request().url();
    const metodo = rota.request().method();

    if (url.includes("/me")) {
      return rota.fulfill({
        json: {
          usuario: {
            id: "u1",
            email: "ana@autoclinic.com",
            nome: "Ana Prado",
            papel: "admin",
            organization_id: "org-autoclinic",
            deve_trocar_senha: false,
          },
        },
      });
    }

    if (url.includes("/carrossel/marca")) {
      return rota.fulfill({
        json: { marca: marca ?? { nome: "", handle: "", avatar_url: null } },
      });
    }

    if (opcoes.geracao && url.includes("/gerar")) {
      return rota.fulfill({ status: opcoes.geracao.status, json: opcoes.geracao.corpo });
    }

    if (opcoes.aprovacao && url.includes("/aprovar")) {
      return rota.fulfill({ status: opcoes.aprovacao.status, json: opcoes.aprovacao.corpo });
    }

    // Item único antes do teste de lista: `/carrosseis` é prefixo de
    // `/carrosseis/<id>`, e a ordem errada devolvia lista onde a tela esperava
    // um carrossel.
    if (ID_NA_ROTA.test(url) && metodo === "GET") {
      const id = ID_NA_ROTA.exec(url)![1];
      const achado = (carrosseis as Record<string, unknown>[]).find((c) => c.id === id);
      const base = achado ?? { id, titulo: "Sem título", briefing: {} };
      return rota.fulfill({
        json: {
          carrossel: documento === null ? base : { ...base, documento },
        },
      });
    }

    if (url.includes("/versoes")) return rota.fulfill({ json: { versoes: [] } });

    if (url.includes("/carrossel/carrosseis") && metodo === "GET") {
      return rota.fulfill({ json: { carrosseis } });
    }

    if (url.includes("/conteudo/fila")) return rota.fulfill({ json: { fila: [] } });

    return rota.fulfill({ json: {} });
  });

  await page.addInitScript(() => {
    try {
      window.localStorage.setItem("ac_refresh", "refresh-de-teste");
    } catch {
      /* origem opaca: sem localStorage */
    }
  });
}

/**
 * Documento padrão do editor com a marca da organização aplicada.
 *
 * É o que o editor "novo" entregava na direção A: `defaultValues` + nome e @ de
 * `/carrossel/marca`. A baseline visual foi medida nesse estado, e o teste da
 * marca procura justamente esses dois textos no slide. O fixture
 * `documento-padrao.json` é `DocumentSchema.parse(defaultValues)` congelado.
 */
function documentoPadraoCom(marca: typeof MARCA_MOCK | null) {
  return {
    ...documentoPadrao,
    config: {
      ...documentoPadrao.config,
      brand: {
        ...documentoPadrao.config.brand,
        name: marca?.nome ?? "",
        handle: marca?.handle ?? "",
      },
    },
  };
}

/** Editor com documento limpo, pronto para medir. */
export async function abrirEditorLimpo(
  page: Page,
  marca: typeof MARCA_MOCK | null = MARCA_MOCK,
) {
  await prepararSessao(page, { marca, documento: documentoPadraoCom(marca) });
  await page.goto(`/carrossel/${ID_EDITOR}/editar`);
  await page.evaluate(() => window.localStorage.clear());
  await page.reload();
  await page.waitForSelector('[id^="page-base-"]', { timeout: 30_000 });
  await page.evaluate(() => document.fonts.ready);
}

/** Tela inicial com a lista mockada, pronta para medir. */
export async function abrirLista(page: Page, opcoes: OpcoesMock = {}, url = "/") {
  await prepararSessao(page, opcoes);
  await page.goto(url);
  await page.waitForSelector(
    "[data-lista], [data-estado='carregando'], [data-estado='vazio'], [data-estado='vazio-aba'], [data-estado='vazio-busca'], [data-estado='erro']",
    { timeout: 60_000 },
  );
  await page.evaluate(() => document.fonts.ready);
}
