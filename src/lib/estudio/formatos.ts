/**
 * Biblioteca de formatos de carrossel, por nicho.
 *
 * De onde vem: levantamento em topcarousels.com (22/11/2026), que pontua carrossel
 * contra a média do próprio criador. Os 9 formatos e as estruturas abaixo são os
 * que o site publica; os números ("2,0× mediana", "25,8% dobraram") são das
 * páginas de formato e de nicho. O documento completo, com os hooks reais
 * transcritos e a fonte de cada linha, está em docs/conteudo/FORMATOS-CARROSSEL.md.
 *
 * O que é NOSSO aqui, e não do site: os nomes em português, o exemplo de uma
 * linha de cada formato, e o arco de slides traduzido para o vocabulário que o
 * pipeline já usa (`FuncaoSlide`). Isso é rotulagem, não invenção de formato.
 *
 * Por que este arquivo existe: o prompt antigo pedia "um carrossel" e recebia
 * ideia genérica de volta. Formato é o que um carrossel tem e um post comum não
 * tem — e o formato precisa ser escolhido antes da copy, não depois.
 */

import type { FuncaoSlide } from "@/lib/conteudo";

export type FormatoId =
  | "lista"
  | "passo-a-passo"
  | "caso-real"
  | "historia"
  | "opiniao"
  | "cheat-sheet"
  | "novidade"
  | "antes-depois"
  | "quiz";

export type NichoId =
  | "clinica-saude"
  | "beleza-estetica"
  | "negocios"
  | "psicologia"
  | "financas"
  | "educacao"
  | "mentalidade"
  | "produtividade"
  | "gastronomia"
  | "design"
  | "conteudo-redes"
  | "relacionamentos";

/** Um passo do arco. `papel` é a instrução que a etapa de plano recebe. */
export interface PassoDoArco {
  funcao: FuncaoSlide;
  papel: string;
}

export interface Formato {
  id: FormatoId;
  /** Nome humano — é o que o usuário leigo escolhe na tela. */
  nome: string;
  /** Uma linha, concreta, do que sai. Escrita por nós. */
  exemplo: string;
  /** Rótulo do formato na fonte. Guardado para rastrear a evidência. */
  origem: string;
  /** Estrutura publicada pela fonte, em pt-BR. */
  estrutura: string[];
  /** "slides, typically" da página do formato. */
  tamanho: string;
  /** O que faz o hook deste formato funcionar. */
  hookFunciona: string;
  /** Evidência global do formato. */
  evidencia: string;
  /** Arco base. O meio é esticado/encolhido para caber no número pedido. */
  arco: PassoDoArco[];
  /** Exemplos de padrão de hook (nosso texto): mostram a FORMA, não o conteúdo. */
  padroes: string[];
  /** Quando NÃO usar. Todo formato tem um limite, e o leigo precisa saber. */
  limite: string;
  /**
   * O quiz é o único formato em que a capa pode ser pergunta — a estrutura
   * publicada é "a pergunta ou o jogo". Nos outros, pergunta mede pior que
   * afirmação (19,5% contra 23,2% dobraram), então a regra de afirmação vale
   * para todos menos para este.
   */
  permitePerguntaNoPrimeiroSlide?: boolean;
  /**
   * Não aparece na lista curta de formatos. Hoje: "Novidade" (o modelo não tem
   * busca — sem notícia real, inventa) e "Antes e depois" (depende de foto do
   * usuário e é o formato de pior conversão). Continuam existindo para quem
   * procura de propósito.
   */
  escondidoDoPadrao?: boolean;
}

export const FORMATOS: Record<FormatoId, Formato> = {
  lista: {
    id: "lista",
    nome: "Lista numerada",
    exemplo: "5 erros que fazem a cliente não voltar",
    origem: "List",
    estrutura: [
      "Slide 1: a promessa, de preferência com número",
      "Slides 2 a N: um item por slide, título curto e uma linha do porquê",
      "Último: recapitulação, ou motivo para salvar/comentar",
    ],
    tamanho: "8 slides (46% dos casos usam 6 a 8)",
    hookFunciona:
      "O número é uma promessa contável: o leitor sabe o tamanho do compromisso. E o item é específico e quase-errado — não 'dicas', e sim 'os erros que a cliente sente e não fala'.",
    evidencia: "25,8% dos 6.653 carrosséis da amostra total dobraram o usual do criador — o formato mais comum. Na biblioteca curada são 3.141, com mediana 2,0× (subconjunto, não a população).",
    arco: [
      { funcao: "gancho", papel: "a promessa com número, nomeando o erro ou o alvo" },
      { funcao: "desenvolvimento", papel: "um item da lista por slide, com o porquê" },
      { funcao: "cta", papel: "uma ação só: salvar, comentar ou chamar" },
    ],
    padroes: [
      "5 erros que fazem a cliente não voltar",
      "7 coisas que a cliente repara na sua recepção e não te conta",
      "3 perguntas que separam a curiosa da cliente que fecha",
    ],
    limite: "Se os itens não ficam de pé sozinhos, não é lista — é texto corrido cortado em pedaços.",
  },
  "passo-a-passo": {
    id: "passo-a-passo",
    nome: "Passo a passo",
    exemplo: "Como fazer a cliente voltar em 30 dias",
    origem: "How-to",
    estrutura: [
      "Slide 1: o resultado que o leitor vai conseguir",
      "Slide 2: o que precisa, ou o erro que quase todo mundo comete",
      "Meio: um passo por slide, em ordem",
      "Último: o resultado final e o pedido para salvar",
    ],
    tamanho: "8 slides (45% usam 6 a 8)",
    hookFunciona:
      "O parêntese nega o conselho óbvio — 'sem dar desconto', 'não é sobre postar mais' — e cria a tensão antes do primeiro arrasto.",
    evidencia: "24,5% de 1.492 carrosséis da amostra total dobraram o usual do criador. Biblioteca curada: 658, mediana 2,0×.",
    arco: [
      { funcao: "gancho", papel: "o resultado, com o conselho óbvio negado entre parênteses" },
      { funcao: "contexto", papel: "o erro que quase todo mundo comete nesse processo" },
      { funcao: "desenvolvimento", papel: "um passo por slide, na ordem em que se faz" },
      { funcao: "virada", papel: "o resultado depois do último passo" },
      { funcao: "cta", papel: "salvar para fazer depois, ou chamar para tirar dúvida" },
    ],
    padroes: [
      "Como fazer a cliente voltar em 30 dias (sem dar desconto)",
      "O que fazer na primeira consulta para a cliente fechar o pacote",
      "Como responder 'vou pensar' sem perder a venda",
    ],
    limite: "Só serve se você consegue ensinar em até 8 passos que a pessoa poderia seguir hoje.",
  },
  "caso-real": {
    id: "caso-real",
    nome: "Um caso real",
    exemplo: "Ela tinha 40% da agenda vazia. Três meses depois, fila de espera.",
    origem: "Case study",
    estrutura: [
      "Slide 1: o resultado, de preferência com número",
      "Slides 2 e 3: o ponto de partida e o problema",
      "Meio: o que foi feito, uma decisão por slide",
      "Último: a lição que o leitor leva",
    ],
    tamanho: "8 slides (30% usam 6 a 8, 30% usam 9 a 12)",
    hookFunciona:
      "Número específico e improvável, mais um contraste de identidade. O leitor não acredita em promessa genérica; acredita no detalhe que ninguém inventaria.",
    evidencia: "22,7% de 841 carrosséis da amostra total dobraram o usual do criador. Biblioteca curada: 344, mediana 1,9×.",
    arco: [
      { funcao: "gancho", papel: "o resultado com número real, sem adjetivo" },
      { funcao: "contexto", papel: "de onde a cliente partiu e o que estava errado" },
      { funcao: "desenvolvimento", papel: "uma decisão por slide, na ordem em que aconteceu" },
      { funcao: "virada", papel: "o que mudou de fato e o que ninguém esperava" },
      { funcao: "cta", papel: "a lição que o leitor aplica hoje, e uma ação" },
    ],
    padroes: [
      "Ela tinha 40% da agenda vazia. Três meses depois, fila de espera.",
      "Uma cliente, 3 procedimentos errados, 1 decisão que mudou o resultado",
    ],
    limite:
      "Exige caso e número reais. Sem dado verdadeiro este formato não pode ser usado — inventar número em saúde é o erro mais caro que existe.",
  },
  historia: {
    id: "historia",
    nome: "História com virada",
    exemplo: "A cliente que sumiu por 8 meses e voltou falando de outra pessoa",
    origem: "Story",
    estrutura: [
      "Slide 1: o momento de tensão, ou o fim surpreendente",
      "Meio: o que aconteceu, uma cena por slide",
      "Penúltimo: a virada, a percepção",
      "Último: o que isso significa para quem está lendo",
    ],
    tamanho: "9 slides (o formato que mais usa carrossel longo)",
    hookFunciona:
      "Cena concreta ou frase cortada. O leitor não recebe a lição, recebe o meio da história — e o arrasto é o que resolve a falta.",
    evidencia: "23,4% de 2.063 carrosséis da amostra total dobraram o usual do criador. Biblioteca curada: 903, mediana 1,9×.",
    arco: [
      { funcao: "gancho", papel: "a cena de tensão, no meio da história, sem entregar o fim" },
      { funcao: "desenvolvimento", papel: "uma cena por slide, na ordem dos fatos" },
      { funcao: "virada", papel: "a percepção que muda o sentido do que aconteceu" },
      { funcao: "cta", papel: "o que isso significa para o leitor, e uma ação" },
    ],
    padroes: [
      "A cliente que sumiu por 8 meses e voltou falando de outra pessoa",
      "Ela tinha vergonha de tirar a foto antes da sessão",
    ],
    limite: "História inventada se percebe no segundo slide. Só use se aconteceu.",
  },
  opiniao: {
    id: "opiniao",
    nome: "Opinião que divide",
    exemplo: "Fidelidade não se compra com desconto",
    origem: "Opinion",
    estrutura: [
      "Slide 1: a tese, sem rodeio",
      "Slides 2 e 3: por que a maioria acredita no contrário",
      "Meio: seus motivos e evidências",
      "Último: a pergunta que convida a responder",
    ],
    tamanho: "7 slides (33% usam 6 a 8)",
    hookFunciona:
      "Nega uma crença que o leitor tem e não sabia que tinha, ou corrige um número que ele assume errado. A tensão é intelectual, e é o formato que mais gera comentário.",
    evidencia: "23,4% de 3.032 carrosséis da amostra total dobraram o usual do criador — o formato que mais gera comentário. Biblioteca curada: 1.321, mediana 2,0×.",
    arco: [
      { funcao: "gancho", papel: "a tese, em afirmação curta, contra o senso comum do nicho" },
      { funcao: "contexto", papel: "por que quase todo mundo acredita no contrário" },
      { funcao: "desenvolvimento", papel: "um motivo por slide, com o que se vê na prática" },
      { funcao: "virada", papel: "o custo de continuar acreditando no contrário" },
      { funcao: "cta", papel: "a pergunta que pede a opinião de quem leu" },
    ],
    padroes: [
      "Fidelidade não se compra com desconto",
      "A cliente não some por preço. Ela some por silêncio.",
      "Agenda cheia não é sinal de clínica saudável",
    ],
    limite: "Precisa de posição defensável. Opinião só para chocar vira comentário raivoso e nenhum agendamento.",
  },
  "cheat-sheet": {
    id: "cheat-sheet",
    nome: "Cheat sheet que se salva",
    exemplo: "O que perguntar antes de fechar um procedimento",
    origem: "Reference",
    estrutura: [
      "Slide 1: o que o guia cobre e para quem",
      "Meio: informação densa e escaneável, layout consistente",
      "Último: lembrete para salvar",
    ],
    tamanho: "7 slides (41% usam 6 a 8)",
    hookFunciona:
      "Promete algo que se guarda. Aqui o alvo é salvamento, não like — e salvamento é o sinal que o Instagram mais valoriza.",
    evidencia: "32% de 194 carrosséis da amostra total dobraram — o melhor formato medido, e o mais raro. Biblioteca curada: 100, mediana 2,5×. Amostra pequena: trate como indício, não como garantia.",
    arco: [
      { funcao: "gancho", papel: "o que o guia cobre e para quem, em afirmação com número" },
      { funcao: "desenvolvimento", papel: "um bloco de informação por slide, no mesmo formato" },
      { funcao: "cta", papel: "salvar para consultar na hora de usar" },
    ],
    padroes: [
      "O que perguntar antes de fechar um procedimento",
      "Tabela: o que indicar para cada tipo de pele",
      "Os 6 sinais de que a cliente não vai voltar",
    ],
    limite: "Se a informação não for útil de verdade, o salvamento não acontece e o formato morre.",
  },
  novidade: {
    id: "novidade",
    nome: "Novidade do nicho",
    exemplo: "O que mudou no Instagram e afeta quem vende pela rede",
    origem: "News",
    estrutura: [
      "Slide 1: a novidade em uma linha",
      "Slide 2: o que mudou exatamente",
      "Meio: quem é afetado e o que fazer",
      "Último: a sua leitura, ou pedido de acompanhar",
    ],
    tamanho: "5 slides (51% usam 2 a 5 — o mais curto)",
    hookFunciona: "Urgência real: 'mudou agora'. Ganha na velocidade e envelhece rápido.",
    evidencia: "18,9% de 1.381 carrosséis da amostra total dobraram o usual do criador — penúltimo pior formato. Biblioteca curada: 481, mediana 1,9×.",
    arco: [
      { funcao: "gancho", papel: "a novidade em uma linha, com o que muda na prática" },
      { funcao: "contexto", papel: "o que exatamente mudou, e desde quando" },
      { funcao: "desenvolvimento", papel: "quem é afetado e o que fazer a respeito" },
      { funcao: "cta", papel: "a sua leitura sobre o assunto, e uma ação" },
    ],
    padroes: [
      "O Instagram mudou o alcance de carrossel. O que isso muda no seu post.",
      "A nova regra do conselho muda o que a clínica pode prometer",
    ],
    limite:
      "Só com novidade real e recente trazida pelo usuário. Sem isso, o texto fica com cara de aviso atrasado. O gerador não tem busca: se o tema não trouxer o fato, ele inventa.",
    escondidoDoPadrao: true,
  },
  "antes-depois": {
    id: "antes-depois",
    nome: "Antes e depois (visual)",
    exemplo: "Antes e depois: pele com acne, 4 sessões",
    origem: "Showcase",
    estrutura: [
      "Slide 1: a imagem mais forte, às vezes com título curto",
      "Meio: uma imagem por slide, em ordem que constrói interesse",
      "Último: um detalhe, um antes e depois, ou os créditos",
    ],
    tamanho: "8 slides",
    hookFunciona: "O texto é mínimo porque a imagem é o hook. Quando há texto, ele é legenda de choque, não título.",
    evidencia: "18,5% de 2.113 carrosséis da amostra total dobraram — o pior formato medido. Biblioteca curada: 706, mediana 1,8×.",
    arco: [
      { funcao: "gancho", papel: "o resultado visual, em uma frase curta que diz o que se vê" },
      { funcao: "desenvolvimento", papel: "um detalhe do processo ou da sessão por slide" },
      { funcao: "virada", papel: "o antes e depois, com o tempo que levou" },
      { funcao: "cta", papel: "chamar para avaliar o caso, ou salvar para depois" },
    ],
    padroes: [
      "Antes e depois: pele com acne, 4 sessões",
      "O mesmo rosto, 3 meses de diferença",
    ],
    limite:
      "Precisa de foto boa e autorizada. Sem imagem forte, este formato tem a pior conversão de todos — não use como padrão. No Brasil, conselho profissional (CFM/CFO) e a política de imagem do Meta restringem antes e depois de paciente: só com autorização e dentro das regras.",
    escondidoDoPadrao: true,
  },
  quiz: {
    id: "quiz",
    nome: "Escolha o seu",
    exemplo: "Qual é o seu tipo de pele? Responda e veja o que indicar",
    origem: "Quiz",
    estrutura: [
      "Slide 1: a pergunta ou o jogo",
      "Meio: as opções, uma por slide ou todas juntas",
      "Último: as respostas, ou pedido para comentar a escolha",
    ],
    tamanho: "11 slides (35% usam 13 a 20)",
    hookFunciona:
      "O leitor precisa chegar ao fim para saber onde ele se encaixa, e a resposta é pública — por isso gera comentário.",
    evidencia: "26,6% de 263 carrosséis da amostra total dobraram — o segundo melhor, e raro. Biblioteca curada: 118, mediana 2,2×. Amostra pequena.",
    arco: [
      { funcao: "gancho", papel: "a afirmação que enquadra o jogo, não a pergunta solta" },
      { funcao: "desenvolvimento", papel: "uma opção por slide, reconhecível na vida real" },
      { funcao: "virada", papel: "a resposta de cada opção, e o que fazer com ela" },
      { funcao: "cta", papel: "comentar o número ou a letra da sua" },
    ],
    padroes: [
      "Existem 4 tipos de pele. A sua decide o tratamento.",
      "Qual é o seu perfil de cliente? Responda e veja o que oferecer.",
    ],
    limite: "Só funciona se as opções forem reconhecíveis. Quiz de opção inventada não gera comentário.",
    permitePerguntaNoPrimeiroSlide: true,
  },
};

export interface Nicho {
  id: NichoId;
  nome: string;
  /** Slug da página do topcarousels que sustenta este nicho. */
  fonte: string;
  /** Formatos ordenados pela mediana medida NO nicho. */
  formatos: { id: FormatoId; mediana: string }[];
  /** Hooks reais que funcionaram NESTE nicho, com autor e score. */
  hooksReais: string[];
}

/**
 * Ordem de cada nicho = mediana medida na página do nicho, do maior para o
 * menor. Onde a fonte não publica a mediana de algum formato, ele entra no fim
 * com a evidência global, e isso está escrito na string.
 */
export const NICHOS: Record<NichoId, Nicho> = {
  "clinica-saude": {
    id: "clinica-saude",
    nome: "Clínica e saúde",
    fonte: "topcarousels.com/carousel-ideas/health-fitness",
    formatos: [
      { id: "novidade", mediana: "2,4× na biblioteca do nicho" },
      { id: "opiniao", mediana: "2,2× na biblioteca do nicho" },
      { id: "lista", mediana: "1,9× na biblioteca do nicho (193 posts)" },
      { id: "passo-a-passo", mediana: "1,9× na biblioteca do nicho" },
      { id: "caso-real", mediana: "1,9× na biblioteca do nicho" },
      { id: "historia", mediana: "1,8× na biblioteca do nicho" },
      { id: "cheat-sheet", mediana: "2,5× global — raro no nicho (amostra pequena)" },
      { id: "quiz", mediana: "2,2× global (amostra pequena)" },
      { id: "antes-depois", mediana: "1,8× global — pior formato, e depende de foto" },
    ],
    hooksReais: [
      "“I just turned 66. Here are 5 things I wish I knew at 26...” — @drmarkhyman, 17×",
      "“It could be the beginning of perimenopause.” — @the_female_lead, 8,7×",
      "“never run a marathon until you read this” — @thepaceproject_, 8,7×",
      "“Runner legs are a cheat code” — @papanca.io, 13×",
    ],
  },
  "beleza-estetica": {
    id: "beleza-estetica",
    nome: "Beleza e estética visual",
    fonte: "topcarousels.com/carousel-ideas/fashion-beauty",
    formatos: [
      { id: "novidade", mediana: "1,9× na biblioteca do nicho" },
      { id: "antes-depois", mediana: "1,7× na biblioteca do nicho (106 posts)" },
      { id: "lista", mediana: "1,6× na biblioteca do nicho (148 posts)" },
      { id: "cheat-sheet", mediana: "2,5× global (amostra pequena)" },
      { id: "opiniao", mediana: "2,0× global" },
      { id: "quiz", mediana: "2,2× global (amostra pequena)" },
    ],
    hooksReais: [
      "“Italian Outfits for Men” — @riccardorricciclothing, 129×",
      "“This girl's crochet pieces are insane.” — @wegotnotaste, 42×",
      "“BOF Why Lilac Is Beauty's New Nude” — @businessofbeauty, 13×",
    ],
  },
  negocios: {
    id: "negocios",
    nome: "Negócios e marketing",
    fonte: "topcarousels.com/carousel-ideas/business",
    formatos: [
      { id: "caso-real", mediana: "2,2× na biblioteca do nicho (137 posts)" },
      { id: "lista", mediana: "2,0× na biblioteca do nicho (298 posts)" },
      { id: "historia", mediana: "1,9× na biblioteca do nicho" },
      { id: "passo-a-passo", mediana: "1,9× na biblioteca do nicho" },
      { id: "opiniao", mediana: "1,9× na biblioteca do nicho" },
      { id: "cheat-sheet", mediana: "1,4× na biblioteca do nicho (12 posts, amostra pequena)" },
      { id: "quiz", mediana: "2,2× global (amostra pequena)" },
    ],
    hooksReais: [
      "“Keep renting Buy a home” — @savvy_stacey, 102×",
      "“8 rare traits I see in every successful female founder” — @linazunigaofficial, 20×",
      "“pov: your degree won't get you hired in 2026.” — @livmanish, 37×",
    ],
  },
  psicologia: {
    id: "psicologia",
    nome: "Comportamento e psicologia",
    fonte: "topcarousels.com/carousel-ideas/psychology",
    formatos: [
      { id: "opiniao", mediana: "2,0× na biblioteca do nicho (95 posts)" },
      { id: "lista", mediana: "1,9× na biblioteca do nicho" },
      { id: "historia", mediana: "1,9× na biblioteca do nicho" },
      { id: "passo-a-passo", mediana: "1,3× na biblioteca do nicho (12 posts, amostra pequena)" },
      { id: "quiz", mediana: "2,2× global (amostra pequena)" },
      { id: "cheat-sheet", mediana: "2,5× global (amostra pequena)" },
    ],
    hooksReais: [
      "“Fake ADHD vs Real ADHD” — @myadhdventure, 23×",
      "“Burnout vs tired” — @diploma.duck, 12×",
      "“Let's Talk About CREATIVE BURNOUT” — @studio_2am, 14×",
    ],
  },
  financas: {
    id: "financas",
    nome: "Finanças pessoais",
    fonte: "topcarousels.com/carousel-ideas/personal-finance",
    formatos: [
      { id: "opiniao", mediana: "2,5× na biblioteca do nicho" },
      { id: "lista", mediana: "2,2× na biblioteca do nicho" },
      { id: "caso-real", mediana: "2,0× na biblioteca do nicho" },
      { id: "passo-a-passo", mediana: "1,9× na biblioteca do nicho" },
      { id: "novidade", mediana: "1,6× na biblioteca do nicho" },
      { id: "cheat-sheet", mediana: "2,5× global (amostra pequena)" },
    ],
    hooksReais: [
      "“The biggest wedding budget mistakes (And how to avoid them.)” — @anti_bride, 23×",
      "“If your mom is rich, you get generational wealth. If your dad is rich, you get half siblings.” — @femaleinvest, 22×",
      "“I'm 32 and.. I am done saving for retirement” — @travelingtoretirement, 19×",
    ],
  },
  educacao: {
    id: "educacao",
    nome: "Educação",
    fonte: "topcarousels.com/carousel-ideas/education",
    formatos: [
      { id: "lista", mediana: "2,1× na biblioteca do nicho (161 posts)" },
      { id: "passo-a-passo", mediana: "2,1× na biblioteca do nicho" },
      { id: "historia", mediana: "1,9× na biblioteca do nicho" },
      { id: "cheat-sheet", mediana: "2,5× global (amostra pequena)" },
      { id: "quiz", mediana: "2,2× global (amostra pequena)" },
    ],
    hooksReais: [
      "“YouTube channels that will make you fluent *without studying” — @thelangspace, 56×",
      "“9 REASONS WHY THE OCEAN IS SCARIER THAN SPACE...” — @terrifying_archive, 94×",
    ],
  },
  mentalidade: {
    id: "mentalidade",
    nome: "Mentalidade e motivação",
    fonte: "topcarousels.com/carousel-ideas/mindset-motivation",
    formatos: [
      { id: "antes-depois", mediana: "2,3× na biblioteca do nicho (16 posts, amostra pequena)" },
      { id: "passo-a-passo", mediana: "2,2× na biblioteca do nicho" },
      { id: "historia", mediana: "2,0× na biblioteca do nicho (174 posts)" },
      { id: "lista", mediana: "1,8× na biblioteca do nicho (435 posts)" },
      { id: "opiniao", mediana: "1,8× na biblioteca do nicho (407 posts)" },
      { id: "cheat-sheet", mediana: "2,5× global (amostra pequena)" },
    ],
    hooksReais: [
      "“The average millionaire is 57. Not 23.” — @creatorkarro, 90×",
      "“THE AVERAGE PRO IS 28 NOT 18” — @worldwide.luca, 108×",
      "“IT HURTS. THAT'S THE POINT.” — @vision9motion, 47×",
    ],
  },
  produtividade: {
    id: "produtividade",
    nome: "Produtividade",
    fonte: "topcarousels.com/carousel-ideas/productivity",
    formatos: [
      { id: "lista", mediana: "3,1× na biblioteca do nicho — a melhor combinação medida" },
      { id: "passo-a-passo", mediana: "2,9× na biblioteca do nicho" },
      { id: "opiniao", mediana: "2,0× global" },
      { id: "cheat-sheet", mediana: "2,5× global (amostra pequena)" },
    ],
    hooksReais: [
      "“How to find time for everything with a 9-5 (it's not about waking up earlier)” — @themiagabriella, 93×",
      "“An organized creative is VERY dangerous.” — @crsnscott, 87×",
    ],
  },
  gastronomia: {
    id: "gastronomia",
    nome: "Gastronomia",
    fonte: "topcarousels.com/carousel-ideas/food",
    formatos: [
      { id: "lista", mediana: "2,4× na biblioteca do nicho (120 posts)" },
      { id: "passo-a-passo", mediana: "2,3× na biblioteca do nicho" },
      { id: "antes-depois", mediana: "1,5× na biblioteca do nicho" },
      { id: "opiniao", mediana: "2,0× global" },
      { id: "cheat-sheet", mediana: "2,5× global (amostra pequena)" },
    ],
    hooksReais: [
      "“f*ck AI we made this with our own hands” — @espressocooly, 266×",
      "“Why Coffee Is the Most Misunderstood Beverage in the World.” — @bevarabia, 122×",
    ],
  },
  design: {
    id: "design",
    nome: "Design e criativo",
    fonte: "topcarousels.com/carousel-ideas/design",
    formatos: [
      { id: "lista", mediana: "2,7× na biblioteca do nicho (332 posts)" },
      { id: "opiniao", mediana: "2,2× na biblioteca do nicho" },
      { id: "passo-a-passo", mediana: "1,9× na biblioteca do nicho" },
      { id: "novidade", mediana: "1,6× na biblioteca do nicho" },
      { id: "caso-real", mediana: "1,5× na biblioteca do nicho" },
      { id: "quiz", mediana: "2,2× global (amostra pequena)" },
    ],
    hooksReais: [
      "“4 unexpected wedding colors I find extremely chic” — @lesaimantsbridal, 8.471×",
      "“THE BEST COLOR COMBOS are inspired by nature” — @reynardlowell, 252×",
      "“fonts that are trending right now :)” — @studio_2am, 104×",
    ],
  },
  "conteudo-redes": {
    id: "conteudo-redes",
    nome: "Conteúdo e redes sociais",
    fonte: "topcarousels.com/carousel-ideas/content-creation",
    formatos: [
      { id: "passo-a-passo", mediana: "2,1× na biblioteca do nicho (154 posts)" },
      { id: "opiniao", mediana: "2,1× na biblioteca do nicho (149 posts)" },
      { id: "caso-real", mediana: "1,9× na biblioteca do nicho" },
      { id: "lista", mediana: "1,8× na biblioteca do nicho (368 posts)" },
      { id: "novidade", mediana: "1,9× global" },
      { id: "cheat-sheet", mediana: "2,5× global (amostra pequena)" },
    ],
    hooksReais: [
      "“how to get 100 NEW FOLLOWERS every day” — @ginnyfears, 40×",
      "“the 10 pillars of personal brand” — @samhxtr, 27×",
      "“STEAL THESE 5 shots FOR BETTER B-ROLL THIS WEEK.” — @chriss.boustedt, 17×",
    ],
  },
  relacionamentos: {
    id: "relacionamentos",
    nome: "Relacionamentos",
    fonte: "topcarousels.com/carousel-ideas/relationships",
    formatos: [
      { id: "passo-a-passo", mediana: "3,0× na biblioteca do nicho — a melhor mediana de formato medida" },
      { id: "opiniao", mediana: "2,2× na biblioteca do nicho" },
      { id: "lista", mediana: "2,0× na biblioteca do nicho" },
      { id: "historia", mediana: "2,0× na biblioteca do nicho" },
      { id: "antes-depois", mediana: "1,9× na biblioteca do nicho" },
      { id: "quiz", mediana: "2,2× global (amostra pequena)" },
    ],
    hooksReais: [
      "“5 WEDDING MISTAKES most couples make” — @ivy.eventideas, 574×",
      "“10 LESSONS IN 10 YEARS OF DATING (from an ex matchmaker)” — @dontdatehimclub, 73×",
    ],
  },
};

export const NICHOS_LISTA: Nicho[] = Object.values(NICHOS);
export const FORMATOS_LISTA: Formato[] = Object.values(FORMATOS);

export function nichoPorId(id: string | undefined): Nicho | null {
  if (!id) return null;
  return (NICHOS as Record<string, Nicho>)[id] ?? null;
}

export function formatoPorId(id: string | undefined): Formato | null {
  if (!id) return null;
  return (FORMATOS as Record<string, Formato>)[id] ?? null;
}

/** Escolha explícita do usuário; nada de adivinhar formato aqui. */
export function formatoDoNicho(nichoId: string | undefined, formatoId: string | undefined) {
  const formato = formatoPorId(formatoId);
  const nicho = nichoPorId(nichoId);
  return { nicho, formato };
}

/**
 * O arco do formato esticado para o número de slides pedido.
 *
 * Esticar é necessário porque o número de cards é escolha do usuário (3 a 10) e
 * os formatos variam de 5 a 11 slides. A regra: gancho primeiro, cta por último,
 * o resto sai do meio do arco — repetindo o passo de desenvolvimento quando
 * sobra espaço, cortando os passos do meio quando falta.
 */
export function esqueleto(formato: Formato, total: number): PassoDoArco[] {
  const n = Math.min(10, Math.max(3, Math.round(total)));
  const arco = formato.arco;
  const primeiro = arco[0]!;
  const ultimo = arco[arco.length - 1]!;
  const meio = arco.slice(1, -1);

  if (n === 2) return [primeiro, ultimo];

  const precisa = n - 2;
  const preenchido: PassoDoArco[] = [];

  if (meio.length === 0) {
    // Formato sem meio (só gancho e cta): o miolo repete o desenvolvimento
    // genérico para não inventar papel que o formato não tem.
    for (let i = 0; i < precisa; i++) {
      preenchido.push({ funcao: "desenvolvimento", papel: "uma informação por slide" });
    }
  } else if (precisa <= meio.length) {
    // Corta do fim do meio, mas a virada (quando existe) nunca é a primeira a
    // cair: é ela que segura o leitor até o CTA.
    const virada = meio.find((p) => p.funcao === "virada");
    const outros = meio.filter((p) => p !== virada);
    const escolhidos = [...outros.slice(0, Math.max(0, precisa - (virada ? 1 : 0)))];
    if (virada && escolhidos.length < precisa) escolhidos.push(virada);
    preenchido.push(...escolhidos.slice(0, precisa));
    // Se ainda faltar (meio só com a virada e precisa > 1), completa.
    while (preenchido.length < precisa) {
      preenchido.push({ funcao: "desenvolvimento", papel: outros[outros.length - 1]?.papel ?? "uma informação por slide" });
    }
  } else {
    preenchido.push(...meio);
    const base = meio.find((p) => p.funcao === "desenvolvimento") ?? meio[meio.length - 1]!;
    while (preenchido.length < precisa) preenchido.push(base);
  }

  return [primeiro, ...preenchido.slice(0, precisa), ultimo];
}

/**
 * Vocabulário concreto por nicho.
 *
 * Por que existe: sem substantivo do mundo real, o modelo foge para a metáfora
 * segura. "A cliente some por silêncio" é bonito e não faz ninguém se reconhecer;
 * "ela fez 3 das 10 sessões e parou de responder no WhatsApp" faz. A lista é
 * vocabulário, não dado: nenhum número, nenhuma estatística, nada que o modelo
 * possa citar como se fosse pesquisa.
 */
export const VOCABULARIO_POR_NICHO: Record<NichoId, string[]> = {
  "clinica-saude": [
    "avaliação inicial",
    "pacote de sessões",
    "retorno de 15 dias",
    "pós-procedimento",
    "mensagem no WhatsApp da recepção",
    "orçamento passado no Direct",
    "cliente que para na terceira sessão",
    "agenda de terça",
    "reavaliação",
    "foto do resultado",
  ],
  "beleza-estetica": [
    "sessão de uma hora",
    "retorno em 30 dias",
    "foto do antes e depois",
    "agenda do salão",
    "orçamento pelo WhatsApp",
    "cliente que só marca em dezembro",
    "retoque",
    "produto em casa",
  ],
  negocios: [
    "fluxo de caixa do mês",
    "cliente que pede desconto",
    "proposta esquecida na gaveta",
    "indicação",
    "concorrente da mesma rua",
    "margem",
    "contrato de 12 meses",
    "planilha de gastos",
    "anúncio que não converte",
  ],
  psicologia: [
    "sessão semanal",
    "encaminhamento",
    "padrão que se repete",
    "autocrítica",
    "limite na relação",
    "sobrecarga",
    "conversa que nunca aconteceu",
  ],
  financas: [
    "reserva de emergência",
    "fatura do cartão",
    "assinatura que ninguém usa",
    "dívida parcelada",
    "orçamento do mês",
    "primeiro salário",
    "boleto que vence amanhã",
  ],
  educacao: [
    "prova de domingo",
    "revisão",
    "resumo no caderno",
    "aula particular",
    "concurso",
    "nota de corte",
    "professor que explica rápido demais",
  ],
  mentalidade: [
    "rotina de segunda-feira",
    "hábito de cinco minutos",
    "meta do trimestre",
    "cansaço acumulado",
    "comparação nas redes",
    "segunda tentativa",
  ],
  produtividade: [
    "caixa de e-mail",
    "agenda lotada",
    "reunião que podia ser mensagem",
    "notificação",
    "lista de tarefas",
    "prazo curto",
    "segunda aba aberta há três dias",
  ],
  gastronomia: [
    "menu",
    "porção",
    "ponto da carne",
    "tempero",
    "retirada no balcão",
    "delivery",
    "fila de sábado",
  ],
  design: [
    "logo",
    "paleta",
    "fonte",
    "rascunho",
    "briefing",
    "feedback do cliente",
    "arquivo final",
    "revisão de terça",
  ],
  "conteudo-redes": [
    "legenda",
    "carrossel",
    "alcance",
    "salvamento",
    "direct",
    "roteiro",
    "gravação de dez minutos",
    "primeiro slide",
  ],
  relacionamentos: [
    "mensagem não respondida",
    "conversa difícil",
    "rotina do casal",
    "aniversário esquecido",
    "acordo de domingo",
    "silêncio de dois dias",
  ],
};

export function vocabularioDoNicho(id: string | undefined): string[] {
  const nicho = nichoPorId(id);
  return nicho ? (VOCABULARIO_POR_NICHO[nicho.id] ?? []) : [];
}

/**
 * Formato sugerido a partir do que a pessoa escreveu.
 *
 * Por que heurística e não escolha obrigatória: 12 nichos × 9 formatos são 108
 * combinações, e quem abre o app quer o carrossel, não um curso de taxonomia. O
 * tema quase sempre já diz o formato — "5 erros" é lista, "como fazer" é passo a
 * passo, "antes e depois" é caso visual. A escolha continua disponível; isso só
 * evita a tela em branco e evita o default cego no formato de melhor mediana
 * (que seria sempre cheat sheet, mesmo sem caber no assunto).
 *
 * Regras determinísticas de propósito: mesma entrada, mesma sugestão, e dá para
 * testar sem chamar modelo.
 */
export function sugerirFormatoDoTema(tema: string): FormatoId {
  const t = tema.toLowerCase();

  if (/antes e depois|antes\/depois|evolu[çc][ãa]o|transforma[çc][ãa]o do resultado/.test(t)) {
    return "caso-real";
  }
  if (/^como\s|^como |passo a passo|o que fazer|jeito de|maneira de/.test(t)) {
    return "passo-a-passo";
  }
  if (/qual [ée] o seu|quiz|tipo de pele|tipo de cabelo|perfil de|descubra o seu/.test(t)) {
    return "quiz";
  }
  if (/checklist|tabela|guia r[áa]pido|o que perguntar|comparativo|cheat sheet/.test(t)) {
    return "cheat-sheet";
  }
  if (
    /\d|erros?|dicas?|sinais|motivos|coisas|formas|maneiras|passos que|listas?/.test(t)
  ) {
    return "lista";
  }
  if (/por que|mito|verdade sobre|n[ãa]o [ée] |opini[ãa]o|pare de|deixe de/.test(t)) {
    return "opiniao";
  }
  if (/hist[óo]ria|aconteceu|caso de|um dia/.test(t)) {
    return "historia";
  }
  return "lista";
}
