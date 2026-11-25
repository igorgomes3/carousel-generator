/**
 * Templates — os 30 do o produto de referência, extraídos do bundle público (REA).
 *
 * Fonte: material inline de carrosseia.com.br/app (`const TEMPLATES=[...]`), lido
 * em 21/11/2026. Cada objeto aqui é o mesmo do alvo nos campos que o produto usa
 * para desenhar: `palette` (fundo, texto, secundário, destaque), `font_display`,
 * `font_body`, `layout`, `capaIA` e o `styleText` que vira prompt da capa.
 *
 * Por que copiar em vez de mapear "temas": a ordem do CEO é clone. Tema genérico
 * (preto/verde/azul) não é escolha do usuário no alvo — o visual vem do template
 * inteiro, com paleta e tipografia amarradas. O seletor de tema morreu junto.
 *
 * `capaIA: true` significa: a capa NASCE de uma imagem gerada (foto de fundo).
 * `capaIA: false` (ex.: Criar do zero, Post / Rede Social, Full Texto) começa sem
 * imagem — gerar ali é opção, não etapa.
 */

export interface PaletteTemplate {
  bg: string;
  text: string;
  muted: string;
  accent: string;
}

export interface TemplateCarrossel {
  id: string;
  nome: string;
  /** Categoria do chip da vitrine ("DIREITO", "SAÚDE", ...); vazio = sem chip. */
  tag: string;
  layout: string;
  capaIA: boolean;
  palette: PaletteTemplate;
  fontDisplay: string;
  fontBody: string;
  styleText: string;
  sample: { title: string; body: string };
  tituloGrande: boolean;
  uniformCards: boolean;
}

export const TEMPLATES: TemplateCarrossel[] = [
  {
    id: "zero",
    nome: "Criar do zero",
    tag: "",
    layout: "zero",
    capaIA: false,
    palette: {
      bg: "#FFFFFF",
      text: "#101114",
      muted: "#6B7280",
      accent: "#0891B2",
    },
    fontDisplay: "Montserrat",
    fontBody: "Inter",
    styleText: "",
    sample: {
      title: "Insira aqui seu texto",
      body: "",
    },
    tituloGrande: false,
    uniformCards: true,
  },
  {
    id: "brand",
    nome: "Brand",
    tag: "",
    layout: "brand",
    capaIA: true,
    palette: {
      bg: "#ECECEC",
      text: "#0B1024",
      muted: "#5A6072",
      accent: "#F0431F",
    },
    fontDisplay: "Archivo Black",
    fontBody: "Inter",
    styleText: "Retrato editorial de moda em estúdio, pessoa jovem e confiante encarando a câmera, luz dura de flash com sombras marcadas, fundo escuro dessaturado, granulação de filme, clima de capa de revista premium, fotorrealista.",
    sample: {
      title: "O novo algoritmo do Instagram em 2026 e o fim do **criador de conteúdo**",
      body: "Porque ter 100 mil seguidores pode ser um péssimo negócio",
    },
    tituloGrande: false,
    uniformCards: false,
  },
  {
    id: "minimalist",
    nome: "Minimalist",
    tag: "",
    layout: "minimalist",
    capaIA: true,
    palette: {
      bg: "#0B0C0F",
      text: "#FFFFFF",
      muted: "#99A1AC",
      accent: "#E5342B",
    },
    fontDisplay: "Anton",
    fontBody: "Inter",
    styleText: "Cena de fundo cinematográfica de alto contraste, uma pessoa ou objeto em destaque no terço superior, luz vermelha dramática de um lado e um toque de luz fria do outro, fundo escuro e desfocado de ambiente moderno, granulação de filme, clima de manchete, fotorrealista.",
    sample: {
      title: "O alcance orgânico **acabou**. E agora?",
      body: "Será que vale a pena insistir?",
    },
    tituloGrande: true,
    uniformCards: true,
  },
  {
    id: "neon",
    nome: "Neon",
    tag: "",
    layout: "neon",
    capaIA: true,
    palette: {
      bg: "#0A0613",
      text: "#FFFFFF",
      muted: "#A79BC2",
      accent: "#A855F7",
    },
    fontDisplay: "Montserrat",
    fontBody: "Inter",
    styleText: "Cena de fundo cinematográfica à noite, uma pessoa em close no terço superior olhando para a câmera, luz de neon roxa e violeta intensa vindo de trás e dos lados, fundo preto com silhuetas desfocadas ao fundo, contraste alto, granulação de filme, clima de cinema, fotorrealista.",
    sample: {
      title: "**Não** contrate {{u:esse}} tipo de **vendedor**",
      body: "a menos que você queira ter **dor de cabeça**",
    },
    tituloGrande: true,
    uniformCards: true,
  },
  {
    id: "aurora",
    nome: "Aurora",
    tag: "",
    layout: "aurora",
    capaIA: true,
    palette: {
      bg: "#04110F",
      text: "#FFFFFF",
      muted: "#93AEA9",
      accent: "#2BE0C8",
    },
    fontDisplay: "Lexend",
    fontBody: "Inter",
    styleText: "Cena de fundo cinematográfica, uma pessoa em close no terço superior olhando para a câmera com expressão séria, luz de neon verde-água e turquesa vinda de trás da cabeça, fundo escuro quase preto, alto contraste, granulação de filme, clima premium de agência, fotorrealista.",
    sample: {
      title: "Você não precisa **investir** em design.",
      body: "Assim como a sua empresa não precisa ser lembrada.",
    },
    tituloGrande: true,
    uniformCards: true,
  },
  {
    id: "impacto",
    nome: "Impacto",
    tag: "",
    layout: "impacto",
    capaIA: true,
    palette: {
      bg: "#120D08",
      text: "#FFFFFF",
      muted: "#B3A392",
      accent: "#22F56B",
    },
    fontDisplay: "Montserrat",
    fontBody: "Inter",
    styleText: "Cena de fundo cinematográfica em um escritório ou biblioteca de madeira escura, uma pessoa de terno sentada em poltrona de couro encarando a câmera, luz quente e dramática, tons de marrom e dourado, objetos em movimento desfocado ao redor, granulação de filme, clima de autoridade, fotorrealista.",
    sample: {
      title: "**Termos secretos** para achar clientes",
      body: "agora você acha fácil",
    },
    tituloGrande: true,
    uniformCards: true,
  },
  {
    id: "autoral",
    nome: "Autoral",
    tag: "",
    layout: "autoral",
    capaIA: true,
    palette: {
      bg: "#070406",
      text: "#FFFFFF",
      muted: "#9C7D86",
      accent: "#DE0340",
    },
    fontDisplay: "Inter",
    fontBody: "Inter",
    styleText: "Fotografia cinematográfica de uma pessoa de moletom vermelho com o capuz na cabeça e fones de ouvido grandes, vista de três quartos por trás com a cabeça erguida, luz vermelha forte de contorno desenhando o capuz e os ombros, fundo quase preto com uma névoa vermelha ao longe, altíssimo contraste, granulação de filme, terço de baixo caindo no preto.",
    sample: {
      title: "Você não tá **atrasado.**",
      body: "Você tá no seu tempo.",
    },
    tituloGrande: false,
    uniformCards: false,
  },
  {
    id: "advogada",
    nome: "Advogada",
    tag: "",
    layout: "advogada",
    capaIA: true,
    palette: {
      bg: "#231B16",
      text: "#F6EEE4",
      muted: "#B6A08B",
      accent: "#C9A063",
    },
    fontDisplay: "DM Serif Display",
    fontBody: "Inter",
    styleText: "Retrato de estúdio quente de uma profissional encostada numa parede bege, luz suave de janela vindo de cima à esquerda com um facho diagonal na parede e a sombra dela ao lado, tons creme, bege e dourado, sem nenhuma cor fria, 85mm com fundo liso, clima acolhedor e seguro, fotorrealista.",
    sample: {
      title: "Quem mais precisa de uma Advogada?",
      body: "geralmente chega com esses **sinais**:",
    },
    tituloGrande: false,
    uniformCards: true,
  },
  {
    id: "video-content",
    nome: "Vídeo Content",
    tag: "VÍDEO",
    layout: "insider",
    capaIA: true,
    palette: {
      bg: "#101826",
      text: "#FFFFFF",
      muted: "#A8B0C4",
      accent: "#F0431F",
    },
    fontDisplay: "Anton",
    fontBody: "Inter",
    styleText: "",
    sample: {
      title: "Seu vídeo vira carrossel em 3 passos",
      body: "",
    },
    tituloGrande: false,
    uniformCards: false,
  },
  {
    id: "post-social",
    nome: "Post / Rede Social",
    tag: "",
    layout: "post",
    capaIA: false,
    palette: {
      bg: "#FFFFFF",
      text: "#0F1419",
      muted: "#536471",
      accent: "#1D9BF0",
    },
    fontDisplay: "Inter",
    fontBody: "Inter",
    styleText: "",
    sample: {
      title: "Eu perdia um dia inteiro fazendo 1 carrossel.",
      body: "Hoje a IA faz em 2 minutos pra mim, veja como.",
    },
    tituloGrande: false,
    uniformCards: false,
  },
  {
    id: "insider",
    nome: "Insider",
    tag: "",
    layout: "insider",
    capaIA: true,
    palette: {
      bg: "#0A0A0B",
      text: "#FFFFFF",
      muted: "#A6A6AD",
      accent: "#E0312E",
    },
    fontDisplay: "Anton",
    fontBody: "Inter",
    styleText: "Cena de fundo cinematográfica e editorial, luz suave e dramática, tons dessaturados com granulação de filme, clima sério e premium de revista.",
    sample: {
      title: "O método que permite publicar 30 posts por semana em menos de 2 horas.",
      body: "",
    },
    tituloGrande: false,
    uniformCards: true,
  },
  {
    id: "full-texto",
    nome: "Full Texto",
    tag: "",
    layout: "fulltext",
    capaIA: false,
    palette: {
      bg: "#16301F",
      text: "#F6DCE4",
      muted: "#24405E",
      accent: "#D7DE7C",
    },
    fontDisplay: "Anton",
    fontBody: "Inter",
    styleText: "",
    sample: {
      title: "As regras dos carrosséis que viralizam",
      body: "7 princípios práticos para criar posts que geram mais salvamentos, compartilhamentos e comentários.",
    },
    tituloGrande: false,
    uniformCards: false,
  },
  {
    id: "essencial",
    nome: "Essencial",
    tag: "",
    layout: "essencial",
    capaIA: true,
    palette: {
      bg: "#0D0C0B",
      text: "#F5ECDD",
      muted: "#B9AFA1",
      accent: "#C9A063",
    },
    fontDisplay: "Anton",
    fontBody: "Inter",
    styleText: "Retrato cinematográfico e editorial de uma pessoa em ambiente real, rosto em foco e fundo desfocado, luz lateral dramática, tons quentes e escuros, clima sério e jornalístico, fotorrealista.",
    sample: {
      title: "Todo mundo viu o resultado. Quase ninguém viu a decisão que fez ele acontecer.",
      body: "",
    },
    tituloGrande: false,
    uniformCards: false,
  },
  {
    id: "advocacia",
    nome: "Advocacia",
    tag: "DIREITO",
    layout: "editorial",
    capaIA: true,
    palette: {
      bg: "#101720",
      text: "#FFFFFF",
      muted: "#B9C4D4",
      accent: "#C9A227",
    },
    fontDisplay: "Anton",
    fontBody: "Inter",
    styleText: "Cena de fundo sóbria e elegante de escritório de advocacia, madeira escura e livros, luz quente lateral, clima sério e confiável.",
    sample: {
      title: "Demitido sem justa causa? Descubra o que fazer.",
      body: "",
    },
    tituloGrande: false,
    uniformCards: false,
  },
  {
    id: "noticias-virais",
    nome: "Notícias Virais",
    tag: "VIRAL",
    layout: "destaque",
    capaIA: true,
    palette: {
      bg: "#0D0F14",
      text: "#FFFFFF",
      muted: "#A9B3C4",
      accent: "#FFB566",
    },
    fontDisplay: "Archivo Black",
    fontBody: "Inter",
    styleText: "Cena de fundo jornalística e urgente, rua ou ambiente corporativo à noite, flashes e telas brilhando ao fundo, tons escuros com luz quente, clima de notícia de última hora, fotorrealista.",
    sample: {
      title: "**Bomba** no mercado: o anúncio que **parou** a internet",
      body: "",
    },
    tituloGrande: false,
    uniformCards: false,
  },
  {
    id: "marketing",
    nome: "Marketing",
    tag: "MARKETING",
    layout: "hook",
    capaIA: true,
    palette: {
      bg: "#140F1E",
      text: "#FFFFFF",
      muted: "#B9AECF",
      accent: "#A78BFA",
    },
    fontDisplay: "Space Grotesk",
    fontBody: "Inter",
    styleText: "Cena de fundo criativa e digital, luz neon roxa e violeta, clima moderno e ousado.",
    sample: {
      title: "Seu anúncio não é ruim. Sua oferta é.",
      body: "O ajuste que dobra o retorno antes de aumentar o orçamento.",
    },
    tituloGrande: false,
    uniformCards: false,
  },
  {
    id: "ia",
    nome: "Inteligência Artificial",
    tag: "IA",
    layout: "destaque",
    capaIA: true,
    palette: {
      bg: "#0E0C0A",
      text: "#FFFFFF",
      muted: "#B8B0A6",
      accent: "#FB923C",
    },
    fontDisplay: "Oswald",
    fontBody: "Inter",
    styleText: "Cena de fundo cinematográfica sobre tecnologia e inteligência artificial, robô ou máquina futurista em ambiente escuro, luz laranja dramática, faíscas e sombras profundas, clima épico e tecnológico.",
    sample: {
      title: "**IA** não vai roubar seu emprego. Quem domina **IA** vai.",
      body: "",
    },
    tituloGrande: false,
    uniformCards: false,
  },
  {
    id: "imobiliaria",
    nome: "Imobiliária",
    tag: "IMÓVEIS",
    layout: "split",
    capaIA: true,
    palette: {
      bg: "#14110D",
      text: "#FFFFFF",
      muted: "#C7BBA8",
      accent: "#D9A441",
    },
    fontDisplay: "Montserrat",
    fontBody: "Inter",
    styleText: "Cena de fundo de imóvel moderno e aspiracional, iluminação quente e elegante, clima de conquista.",
    sample: {
      title: "O erro que faz você pagar caro no primeiro imóvel",
      body: "Confira isso antes de assinar qualquer contrato.",
    },
    tituloGrande: false,
    uniformCards: false,
  },
  {
    id: "nutricionista",
    nome: "Nutricionista",
    tag: "NUTRIÇÃO",
    layout: "mentalidade",
    capaIA: true,
    palette: {
      bg: "#0F1A12",
      text: "#FFFFFF",
      muted: "#B5CDB9",
      accent: "#5FBF6E",
    },
    fontDisplay: "Sora",
    fontBody: "Inter",
    styleText: "Cena de fundo clara e vibrante com comida saudável e ingredientes frescos, luz natural, clima leve e energético.",
    sample: {
      title: "Comer bem não é comer menos.",
      body: "Os 3 ajustes no prato que mudam sua energia na primeira semana.",
    },
    tituloGrande: false,
    uniformCards: false,
  },
  {
    id: "medicos",
    nome: "Médicos / Hospitalar",
    tag: "SAÚDE",
    layout: "editorial",
    capaIA: true,
    palette: {
      bg: "#0D141C",
      text: "#FFFFFF",
      muted: "#A9BCD0",
      accent: "#3B82F6",
    },
    fontDisplay: "Lexend",
    fontBody: "Inter",
    styleText: "Cena de fundo hospitalar moderna, luz azulada clínica com um toque quente, clima sério e humano.",
    sample: {
      title: "Os sinais silenciosos que o seu corpo dá antes de adoecer.",
      body: "",
    },
    tituloGrande: false,
    uniformCards: false,
  },
  {
    id: "educacao",
    nome: "Educação / Professores",
    tag: "EDUCAÇÃO",
    layout: "hook",
    capaIA: true,
    palette: {
      bg: "#101825",
      text: "#FFFFFF",
      muted: "#C4CBD4",
      accent: "#FACC15",
    },
    fontDisplay: "Baloo 2",
    fontBody: "Inter",
    styleText: "Cena de fundo de sala de aula ou ambiente de estudo, quadro e giz, luz quente, clima inspirador.",
    sample: {
      title: "Seu aluno não é desatento. Sua aula é previsível.",
      body: "Três mudanças que prendem a turma até o fim.",
    },
    tituloGrande: false,
    uniformCards: false,
  },
  {
    id: "clinica-estetica",
    nome: "Clínica de Estética",
    tag: "CLÍNICA",
    layout: "mentalidade",
    capaIA: true,
    palette: {
      bg: "#18181A",
      text: "#FFFFFF",
      muted: "#C9C4BE",
      accent: "#D9B991",
    },
    fontDisplay: "Abril Fatface",
    fontBody: "Inter",
    styleText: "Retrato de estúdio elegante sobre fundo cinza neutro, luz de beleza suave e difusa, clima premium, minimalista e sofisticado de clínica de estética.",
    sample: {
      title: "Harmonização não é exagero. É equilíbrio.",
      body: "O que avaliar antes de fechar seu procedimento.",
    },
    tituloGrande: false,
    uniformCards: false,
  },
  {
    id: "contabilidade",
    nome: "Contabilidade e Financeiro",
    tag: "FINANÇAS",
    layout: "split",
    capaIA: true,
    palette: {
      bg: "#0E1512",
      text: "#FFFFFF",
      muted: "#A8C0B4",
      accent: "#10B981",
    },
    fontDisplay: "IBM Plex Sans",
    fontBody: "Inter",
    styleText: "Cena de fundo de mesa de trabalho financeira elegante, tons verde-escuros e dourados, luz dramática, clima profissional.",
    sample: {
      title: "MEI ou ME? A escolha errada custa caro no imposto.",
      body: "Onde está o limite e quando migrar.",
    },
    tituloGrande: false,
    uniformCards: false,
  },
  {
    id: "academia",
    nome: "Academia / Fitness",
    tag: "TREINO",
    layout: "hook",
    capaIA: true,
    palette: {
      bg: "#111413",
      text: "#FFFFFF",
      muted: "#B7C2B9",
      accent: "#A3E635",
    },
    fontDisplay: "Bebas Neue",
    fontBody: "Inter",
    styleText: "Cena de fundo de academia moderna com pesos e equipamentos, luz dramática de alto contraste com toque neon verde-limão, clima intenso e motivador.",
    sample: {
      title: "Você não precisa de mais motivação. Precisa de um plano.",
      body: "O treino de 45 minutos que cabe na sua rotina.",
    },
    tituloGrande: false,
    uniformCards: false,
  },
  {
    id: "turismo",
    nome: "Turismo",
    tag: "VIAGEM",
    layout: "mentalidade",
    capaIA: true,
    palette: {
      bg: "#0C161B",
      text: "#FFFFFF",
      muted: "#A9C6CE",
      accent: "#FB923C",
    },
    fontDisplay: "Fjalla One",
    fontBody: "Inter",
    styleText: "Cena de fundo de destino de viagem deslumbrante, golden hour, cores vivas, clima de aventura.",
    sample: {
      title: "Roteiro de 5 dias que cabe no seu bolso",
      body: "Viaje mais gastando menos, com o passo a passo.",
    },
    tituloGrande: false,
    uniformCards: false,
  },
  {
    id: "beleza",
    nome: "Beleza e Estética",
    tag: "ESTÉTICA",
    layout: "mentalidade",
    capaIA: true,
    palette: {
      bg: "#1A1114",
      text: "#FFFFFF",
      muted: "#D4B9C4",
      accent: "#F472B6",
    },
    fontDisplay: "Syne",
    fontBody: "Inter",
    styleText: "Cena de fundo de estúdio de beleza sofisticado, luz rosê suave, clima luxuoso e delicado.",
    sample: {
      title: "Sua pele não precisa de mais produto. Precisa de ordem.",
      body: "A sequência certa do skincare em 4 passos.",
    },
    tituloGrande: false,
    uniformCards: false,
  },
  {
    id: "categoria",
    nome: "Notícias",
    tag: "URGENTE",
    layout: "categoria",
    capaIA: true,
    palette: {
      bg: "#101418",
      text: "#FFFFFF",
      muted: "#9FB3C8",
      accent: "#E53935",
    },
    fontDisplay: "Archivo Black",
    fontBody: "Inter",
    styleText: "Cena de fundo urbana e jornalística, clima de notícia quente, luz dramática, fotorrealista.",
    sample: {
      title: "A decisão que mexe com o bolso de todo brasileiro",
      body: "",
    },
    tituloGrande: false,
    uniformCards: false,
  },
  {
    id: "dentistas",
    nome: "Dentistas",
    tag: "SAÚDE BUCAL",
    layout: "split",
    capaIA: true,
    palette: {
      bg: "#0D1619",
      text: "#FFFFFF",
      muted: "#A9C4CC",
      accent: "#2DD4BF",
    },
    fontDisplay: "Poppins",
    fontBody: "Inter",
    styleText: "Cena de fundo de clínica odontológica moderna e limpa, luz branca e azulada suave, clima profissional e acolhedor.",
    sample: {
      title: "Clareamento: o que ninguém te conta antes de fazer",
      body: "Mitos, cuidados e o resultado real.",
    },
    tituloGrande: false,
    uniformCards: false,
  },
  {
    id: "joias",
    nome: "Joias e Semijoias",
    tag: "JOIAS",
    layout: "split",
    capaIA: true,
    palette: {
      bg: "#151013",
      text: "#FFFFFF",
      muted: "#CBBFB4",
      accent: "#D4AF37",
    },
    fontDisplay: "Playfair Display",
    fontBody: "Inter",
    styleText: "Cena de fundo de joalheria de luxo, joias de ouro e pedras brilhando sobre tecido escuro, luz quente e dramática, macro fotográfico, clima sofisticado e premium.",
    sample: {
      title: "Semijoia de qualidade existe. Aprenda a reconhecer.",
      body: "Os detalhes que separam uma peça durável de uma que escurece.",
    },
    tituloGrande: false,
    uniformCards: false,
  },
  {
    id: "pets",
    nome: "Pets",
    tag: "PETS",
    layout: "hook",
    capaIA: true,
    palette: {
      bg: "#171310",
      text: "#FFFFFF",
      muted: "#CBBBA8",
      accent: "#F59E0B",
    },
    fontDisplay: "Righteous",
    fontBody: "Inter",
    styleText: "Cena de fundo com animal de estimação carismático, luz quente de estúdio, clima alegre e afetuoso.",
    sample: {
      title: "Seu cachorro não é teimoso. Ele não te entendeu.",
      body: "O jeito certo de ensinar comandos sem estresse.",
    },
    tituloGrande: false,
    uniformCards: false,
  }
];

/** Chips da vitrine, na ordem do alvo (Todos primeiro). */
export const CATEGORIAS: string[] = [
  "Todos",
  "DIREITO",
  "SAÚDE",
  "VIRAL",
  "VIAGEM",
  "URGENTE",
  "VÍDEO",
  "IMÓVEIS",
  "NUTRIÇÃO",
  "TREINO",
  "FINANÇAS",
  "CLÍNICA",
  "MARKETING",
  "IA",
  "SAÚDE BUCAL",
  "EDUCAÇÃO",
  "ESTÉTICA",
  "JOIAS",
  "PETS",
];

/**
 * Fonte do template → pilha CSS. Só 11 famílias são carregadas de verdade
 * (`layout.tsx`); o resto cai na mais próxima em vez de virar Times New Roman.
 */
const PILHAS: Record<string, string> = {
  "Anton": "Anton, Impact, sans-serif",
  "Oswald": "Oswald, Impact, sans-serif",
  "Bebas Neue": "Bebas Neue, Impact, sans-serif",
  "Fjalla One": "Oswald, Impact, sans-serif",
  "Archivo Black": "var(--font-archivo-black), Impact, sans-serif",
  "Playfair Display": "Playfair Display, Georgia, serif",
  "Abril Fatface": "Playfair Display, Georgia, serif",
  "DM Serif Display": "var(--font-dm-serif-display), Georgia, serif",
  "Space Grotesk": "Space Grotesk, system-ui, sans-serif",
  "Inter": "var(--font-inter), system-ui, sans-serif",
  "Montserrat": "var(--font-montserrat), system-ui, sans-serif",
  "Poppins": "var(--font-montserrat), system-ui, sans-serif",
  "Sora": "var(--font-montserrat), system-ui, sans-serif",
  "Lexend": "var(--font-inter), system-ui, sans-serif",
  "Baloo 2": "var(--font-montserrat), system-ui, sans-serif",
  "Righteous": "var(--font-montserrat), system-ui, sans-serif",
  "IBM Plex Sans": "var(--font-inter), system-ui, sans-serif",
  "Syne": "var(--font-syne), system-ui, sans-serif",
  "Ultra": "var(--font-ultra), Impact, serif",
  "Roboto": "var(--font-roboto), system-ui, sans-serif",
};

export function pilhaFonte(familia: string): string {
  return PILHAS[familia] ?? "var(--font-inter), system-ui, sans-serif";
}

/**
 * A família tem pilha própria neste build?
 *
 * `pilhaFonte` devolve a pilha do Inter para QUALQUER nome desconhecido — é o
 * fallback que evita texto em Times. O efeito colateral é que "fonte carregou?"
 * não pode ser respondido comparando com o fallback (Inter VALE o fallback).
 * Por isso a pergunta certa é de pertinência, e ela vive aqui, junto do mapa.
 * Usado pela curadoria do estúdio (`estilo.test.ts`): um par de fontes com nome
 * que não existe viraria PNG em Arial sem aviso nenhum.
 */
export function temPilhaPropria(familia: string): boolean {
  return Object.prototype.hasOwnProperty.call(PILHAS, familia);
}

export function templatePorId(id: string | null | undefined): TemplateCarrossel {
  return TEMPLATES.find((t) => t.id === id) ?? TEMPLATES[1];
}

/** Templates filtrados por chip; "Todos" devolve a lista inteira. */
export function templatesDaCategoria(categoria: string): TemplateCarrossel[] {
  if (!categoria || categoria === "Todos") return TEMPLATES;
  return TEMPLATES.filter((t) => t.tag === categoria);
}
