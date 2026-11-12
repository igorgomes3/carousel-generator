/**
 * Teste das regras da tela inicial.
 *
 * Roda sem navegador e sem API: `npx tsx src/lib/carrosseis/lista.test.ts`.
 * O que este arquivo prova, critério por critério da §8.1 do plano:
 *   5. contagem da aba = contagem dos itens da aba, e a aba não mistura estado;
 *   7. termo que existe SÓ na legenda devolve o carrossel (busca antiga não
 *      devolveria: filtrava título, no cliente);
 *   §2.4 ordenação por `estado_em` ascendente ("mais antigo parado");
 *   §2.6 paginação de 24 com o rodapé "1–24 de 58".
 */
import {
  aplicarParametros,
  buscar,
  contagensPorAba,
  contagensPorEstado,
  daAba,
  linhaDeDensidade,
  normalizar,
  ordenar,
  paginar,
  resumoDaPeca,
  textoResumoDaPeca,
  coresDaCapa,
  ehEstado,
  type Carrossel,
} from "./lista";

let falhas = 0;

function ok(nome: string, condicao: boolean, detalhe = "") {
  if (condicao) {
    console.log(`  ok   ${nome}`);
    return;
  }
  falhas += 1;
  console.log(`  FALHA ${nome}${detalhe ? ` — ${detalhe}` : ""}`);
}

const AGORA = Date.now();
const horas = (n: number) => new Date(AGORA - n * 3_600_000).toISOString();
const dias = (n: number) => new Date(AGORA - n * 86_400_000).toISOString();

function carrossel(parcial: Partial<Carrossel> & { id: string }): Carrossel {
  return {
    titulo: `Carrossel ${parcial.id}`,
    estado: "pronta",
    estado_em: horas(2),
    atualizado_em: horas(2),
    slides: 7,
    capa: { titulo: `Capa ${parcial.id}`, fundo: "#f7f5f2", cor_texto: "#141414", slides: 7 },
    ...parcial,
  };
}

/** O cenário do critério 5: 3 `aguardando_aprovacao` + 2 `aprovada`. */
const CINCO: Carrossel[] = [
  carrossel({ id: "a1", estado: "aguardando_aprovacao" }),
  carrossel({ id: "a2", estado: "aguardando_aprovacao" }),
  carrossel({ id: "a3", estado: "aguardando_aprovacao" }),
  carrossel({ id: "b1", estado: "aprovada" }),
  carrossel({ id: "b2", estado: "aprovada" }),
];

console.log("abas e contagens (§2.3, critério 5)");
{
  const contagens = contagensPorAba(CINCO);
  ok("aba Para aprovar conta 3", contagens.para_aprovar === 3, `veio ${contagens.para_aprovar}`);
  ok("aba Aprovadas conta 2", contagens.aprovadas === 2, `veio ${contagens.aprovadas}`);
  ok("aba Todas conta 5", contagens.todas === 5, `veio ${contagens.todas}`);

  const paraAprovar = daAba(CINCO, "para_aprovar");
  ok("aba Para aprovar devolve 3 itens", paraAprovar.length === 3, `veio ${paraAprovar.length}`);
  ok(
    "aba Para aprovar não mistura estado alheio",
    paraAprovar.every((c) => c.estado === "aguardando_aprovacao" || c.estado === "pronta"),
  );
  ok(
    "aba Aprovadas devolve só aprovadas",
    daAba(CINCO, "aprovadas").every((c) => c.estado === "aprovada"),
  );

  // `pronta` cai em "Para aprovar" com aviso de legenda faltando: é o que a §2.3
  // decide juntar, e o teste evita que alguém "conserte" isso para uma aba nova.
  const comPronta = [...CINCO, carrossel({ id: "c1", estado: "pronta" })];
  ok("`pronta` entra em Para aprovar", contagensPorAba(comPronta).para_aprovar === 4);

  const porEstado = contagensPorEstado(comPronta);
  ok("contagem por estado tem os seis", Object.keys(porEstado).length === 6);
  ok("contagem de `aguardando_aprovacao` = 3", porEstado.aguardando_aprovacao === 3);
  ok("contagem de `publicada` = 0", porEstado.publicada === 0);
}

console.log("busca (§2.4, critério 7)");
{
  const lista: Carrossel[] = [
    carrossel({
      id: "l1",
      titulo: "Harmonização facial: o que muda com a nova regra",
      legenda: "Protocolo de avaliação antes da aplicação. Nada de exagero.",
      hashtags: ["#estetica", "#anvisa"],
    }),
    carrossel({ id: "l2", titulo: "Precificação de protocolo", legenda: "Margem por serviço." }),
  ];

  const soNaLegenda = buscar(lista, "exagero");
  ok("acha termo que só existe na legenda", soNaLegenda.length === 1 && soNaLegenda[0].id === "l1");
  ok("acha por hashtag", buscar(lista, "anvisa").length === 1);
  ok("acha por título", buscar(lista, "precificação").length === 1);
  ok("busca é sem acento", buscar(lista, "precificacao").length === 1);
  ok("busca ignora caixa", buscar(lista, "HARMONIZAÇÃO").length === 1);
  ok("termo inexistente devolve vazio", buscar(lista, "forno de pizza").length === 0);
  ok("termo vazio devolve tudo", buscar(lista, "  ").length === 2);
  ok(
    "duas palavras exigem as duas",
    buscar(lista, "protocolo margem").length === 1 &&
      buscar(lista, "protocolo exagero").length === 1,
  );
  ok("normalizar tira acento e caixa", normalizar("  Ação Ção ") === "acao cao");
}

console.log("ordenação (§2.4)");
{
  const lista: Carrossel[] = [
    carrossel({ id: "n1", titulo: "B", estado_em: dias(6), atualizado_em: horas(1) }),
    carrossel({ id: "n2", titulo: "C", estado_em: dias(1), atualizado_em: horas(30) }),
    carrossel({ id: "n3", titulo: "A", estado_em: dias(10), atualizado_em: horas(5) }),
  ];
  ok(
    "atualizado: mais recente primeiro",
    ordenar(lista, "atualizado").map((c) => c.id).join() === "n1,n3,n2",
  );
  ok(
    "mais antigo parado: estado_em ascendente",
    ordenar(lista, "parado").map((c) => c.id).join() === "n3,n1,n2",
  );
  ok(
    "título A–Z sem acento",
    ordenar(lista, "titulo").map((c) => c.titulo).join("") === "ABC",
  );
}

console.log("paginação (§2.6)");
{
  const muitos = Array.from({ length: 58 }, (_, i) => carrossel({ id: `p${i}` }));
  const primeira = paginar(muitos, 1);
  ok("24 por página", primeira.itens.length === 24);
  ok("rodapé diz 1–24 de 58", primeira.intervalo === "1–24 de 58", primeira.intervalo);
  const terceira = paginar(muitos, 3);
  ok("última página tem 10", terceira.itens.length === 10, `veio ${terceira.itens.length}`);
  ok("rodapé da última diz 49–58 de 58", terceira.intervalo === "49–58 de 58", terceira.intervalo);
  ok("página fora do intervalo é presa na última", paginar(muitos, 99).pagina === 3);
  ok("lista vazia tem 1 página e 0 itens", paginar([], 1).itens.length === 0);
  ok("lista vazia diz 0–0 de 0", paginar([], 1).intervalo === "0–0 de 0", paginar([], 1).intervalo);
}

console.log("pipeline completo (aba + busca + ordem + página)");
{
  const lista = [
    ...CINCO,
    carrossel({ id: "z1", estado: "publicada", publicada_em: dias(2), atualizado_em: horas(3) }),
    carrossel({ id: "z2", titulo: "Outro assunto", estado: "a_produzir", atualizado_em: horas(4) }),
  ];
  const r = aplicarParametros(lista, {
    aba: "para_aprovar",
    q: "",
    estado: null,
    ordem: "atualizado",
    fonte: null,
    de: null,
    ate: null,
    pagina: 1,
  });
  ok("pipeline: aba filtra", r.itens.length === 3);
  ok("pipeline: contagens são da organização inteira", r.contagens.todas === 7);
  ok("pipeline: totalOrganizacao ignora busca", r.totalOrganizacao === 7);

  const comBusca = aplicarParametros(lista, {
    aba: "todas",
    q: "z1",
    estado: null,
    ordem: "atualizado",
    fonte: null,
    de: null,
    ate: null,
    pagina: 1,
  });
  ok("pipeline: busca dentro da aba Todas", comBusca.itens.length === 1 && comBusca.itens[0].id === "z1");

  // Estado fora da lista de seis não é filtro: é parâmetro inválido, e quem o
  // descarta é `ehEstado` na leitura da URL — nunca um `filter` que devolve zero
  // e faz a tela dizer "nada encontrado" por causa de um typo na query.
  ok("estado inválido é recusado na leitura da URL", !ehEstado("agora") && !ehEstado("vazio"));
  ok("estado válido é aceito", ehEstado("aguardando_aprovacao"));

  const janela = aplicarParametros(lista, {
    aba: "todas",
    q: "",
    estado: null,
    ordem: "publicacao",
    fonte: null,
    de: dias(30),
    ate: new Date().toISOString().slice(0, 10),
    pagina: 1,
  });
  ok("período sobre publicada_em devolve só o publicado", janela.itens.length === 1);
}

console.log("textos do cartão (§2.2)");
{
  const c = carrossel({
    id: "t1",
    slides: 7,
    atualizado_em: horas(2),
    legenda: "x".repeat(312),
    hashtags: Array.from({ length: 8 }, (_, i) => `#tag${i}`),
    fotos: 2,
  });
  ok("linha de densidade", linhaDeDensidade(c) === "7 slides · 1080×1350 · há 2 h", linhaDeDensidade(c));
  const resumo = resumoDaPeca(c);
  ok("linha 4 monta legenda/hashtags/fotos", !!resumo);
  ok(
    "texto da linha 4",
    textoResumoDaPeca(resumo!) === "legenda 312/2200 · 8 hashtags · 2 fotos",
    textoResumoDaPeca(resumo!),
  );
  ok("linha 4 ausente quando não há dado", resumoDaPeca(carrossel({ id: "t2" })) === null);

  const comCapa = coresDaCapa(c);
  ok("capa real usa o fundo do slide 1", comCapa.real && comCapa.fundo === "#f7f5f2", comCapa.fundo);
  ok("capa real usa a cor de texto do slide", comCapa.texto === "#141414");
  const semCapa = coresDaCapa({ ...carrossel({ id: "t3" }), capa: null });
  ok("sem capa cai no tom estável por id", !semCapa.real && /^#[0-9A-F]{6}$/i.test(semCapa.fundo));
  ok(
    "tom de reserva é estável",
    coresDaCapa({ ...carrossel({ id: "t3" }), capa: null }).fundo === semCapa.fundo,
  );
}

if (falhas > 0) {
  console.log(`\n${falhas} falha(s)`);
  process.exit(1);
}
console.log("\ntudo certo");
