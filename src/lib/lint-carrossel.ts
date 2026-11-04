/**
 * Portão de qualidade do carrossel.
 *
 * Adaptado de três referências que fazem isso melhor que a média:
 *   - `dean9703111/ig-card-generator`: lint bloqueante (cards 5–10, capa com hook,
 *     um conceito por card, limite de caracteres, CTA com verbo de ação, lista de
 *     "voz de IA" proibida). Nada é exportado com erro pendente.
 *   - `arjunsinghjamwal/carousel-pipeline`: "tripwire" de frases proibidas antes de
 *     a peça avançar, com lista configurável por marca.
 *   - `johnnyang0612/bearcarousel`: a peça é auditada depois de desenhada — excesso
 *     de texto no slide é defeito, não estilo.
 *
 * Regra de desenho: erro bloqueia e volta para o modelo com a lista; aviso apenas
 * informa. Reprovar tudo transforma o portão em ruído e alguém desliga o portão.
 */

export interface SlideParaLint {
  elements: { type: string; text?: string }[];
}

export interface ResultadoLint {
  erros: string[];
  avisos: string[];
}

/** Frases que denunciam texto de IA. Adaptadas para estética em pt-BR. */
const VOZ_DE_IA = [
  "eleve seu",
  "eleve sua",
  "mergulhe",
  "desbloqueie",
  "no mundo de hoje",
  "não é apenas",
  "não é somente",
  "revolucion",
  "game changer",
  "transforme sua vida",
  "segredo revelado",
  "descubra como",
  "jornada de",
  "potencialize",
  "vamos juntos",
  "cuide de você",
  "seu eu do futuro",
];

/** Verbo de ação aceito no CTA. Se não tem nenhum, o último slide não pede nada. */
const VERBOS_CTA = [
  "agende",
  "chame",
  "chama",
  "salve",
  "comente",
  "comenta",
  "responda",
  "mande",
  "clique",
  "arraste",
  "veja",
  "confira",
  "fale",
  "marque",
  "envie",
];

const EMOJI = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u;

function palavras(texto: string): number {
  return texto.trim().split(/\s+/).filter(Boolean).length;
}

function textoDe(slide: SlideParaLint, tipo: string): string {
  return slide.elements
    .filter((e) => e.type === tipo)
    .map((e) => (e.text ?? "").trim())
    .join(" ")
    .trim();
}

/**
 * Audita a copy. `minimoSlides` e `maximoSlides` vêm do plano: um carrossel de 6
 * slides planejado não pode virar 3 sem que isso seja erro.
 */
export function lintCarrossel(slides: SlideParaLint[], faixa = { min: 5, max: 10 }): ResultadoLint {
  const erros: string[] = [];
  const avisos: string[] = [];

  if (slides.length < faixa.min) erros.push(`carrossel com ${slides.length} slides (mínimo ${faixa.min})`);
  if (slides.length > faixa.max) avisos.push(`carrossel com ${slides.length} slides (recomendado até ${faixa.max})`);

  const titulosVistos = new Map<string, number>();

  slides.forEach((slide, i) => {
    const n = i + 1;
    const titulo = textoDe(slide, "Title");
    const subtitulo = textoDe(slide, "Subtitle");
    const descricao = textoDe(slide, "Description");
    const corpo = [subtitulo, descricao].filter(Boolean).join(" ");

    if (!titulo && !subtitulo) erros.push(`slide ${n} sem título nem subtítulo`);

    if (slide.elements.length < 2) {
      erros.push(`slide ${n} tem ${slide.elements.length} elemento (mínimo 2: título + corpo)`);
    }

    if (corpo.length < 20) {
      erros.push(`slide ${n} sem corpo de texto suficiente (${corpo.length} caracteres)`);
    } else {
      const p = palavras(corpo);
      if (p < 8) erros.push(`slide ${n} com ${p} palavras de corpo (mínimo 8)`);
      if (p > 40) avisos.push(`slide ${n} com ${p} palavras (acima de 40 cansa no celular)`);
    }

    if (titulo && palavras(titulo) > 8) {
      avisos.push(`slide ${n} com título de ${palavras(titulo)} palavras (ideal até 6)`);
    }

    const tudo = `${titulo} ${corpo}`;
    if (EMOJI.test(tudo)) erros.push(`slide ${n} tem emoji (o visual já carrega a ênfase)`);

    for (const frase of VOZ_DE_IA) {
      if (tudo.toLowerCase().includes(frase)) erros.push(`slide ${n} usa voz de IA: "${frase}"`);
    }

    if (titulo) {
      const chave = titulo.toLowerCase();
      const anterior = titulosVistos.get(chave);
      if (anterior !== undefined) {
        erros.push(`slide ${n} repete o título do slide ${anterior} (um conceito por slide)`);
      } else {
        titulosVistos.set(chave, n);
      }
    }

    if (/\d/.test(tudo)) {
      avisos.push(`slide ${n} cita número: confirme se o dado é real antes de publicar`);
    }
  });

  // Capa: o primeiro slide decide o alcance. Precisa ser frase, não apresentação.
  const capa = slides[0];
  if (capa) {
    const tituloCapa = textoDe(capa, "Title");
    const corpoCapa = [textoDe(capa, "Subtitle"), textoDe(capa, "Description")].join(" ").trim();
    const capaInteira = `${tituloCapa} ${corpoCapa}`.trim();
    if (capaInteira.length > 120) avisos.push(`capa com ${capaInteira.length} caracteres (ideal até 120)`);
    if (/conheça (o|a|nosso|nossa)/i.test(capaInteira)) {
      erros.push('capa começa com "conheça nosso": isso é anúncio, não gancho');
    }
  }

  // CTA: último slide precisa pedir uma coisa concreta.
  const ultimo = slides[slides.length - 1];
  if (ultimo) {
    const textoUltimo = ultimo.elements
      .map((e) => (e.text ?? "").toLowerCase())
      .join(" ");
    const temVerbo = VERBOS_CTA.some((v) => textoUltimo.includes(v));
    if (!temVerbo) erros.push("último slide não tem CTA com verbo de ação (agende, chame, salve, comente…)");
  }

  return { erros, avisos };
}
