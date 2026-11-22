# Formatos de carrossel que performam — catálogo com fonte

Levantado em **22/11/2026** a partir de **topcarousels.com**, que pontua carrosséis do
Instagram contra a média do próprio criador (o "uau" da conta, não likes absolutos).

- Página de ideias: https://topcarousels.com/carousel-ideas
- Páginas de formato: `https://topcarousels.com/carousel-examples/<formato>`
- Estatísticas (18.215 carrosséis): https://topcarousels.com/instagram-carousel-statistics
- Como o score é calculado: https://topcarousels.com/blog/what-is-an-outlier-carousel
- Remix de um outlier (regras do autor): https://topcarousels.com/blog/how-to-remix-a-viral-carousel

**O que "score" quer dizer aqui:** likes + comentários do post dividido pela mediana de até
20 carrosséis do mesmo criador, publicados perto no tempo. `3×` = três vezes o usual dele.
Isso é o que separa "conta grande" de "post que funcionou". Metade dos posts bate a própria
mediana por definição (a mediana é a referência), então o número útil é **quantos dobraram**
o usual dentro de cada grupo.

**Amostra da biblioteca:** 9.779 carrosséis outlier de 333 criadores, distribuídos em 9
formatos e 18 nichos. Achado central da página inicial: 8 slides é o tamanho típico, e o
formato mais comum é **List**.

Tudo neste documento vem de página lida do site, com o número que estava na página. O que
for leitura minha (nossa interpretação, nosso rótulo em português, nosso exemplo escrito) está
marcado como **[inferência]** ou **[nosso]**. Nenhum formato foi inventado.

---

## 0. O que os números medem (18.215 carrosséis)

Fonte: `/instagram-carousel-statistics`, atualizado em 22/11/2026.

| Métrica | Valor |
|---|---|
| Dobraram o usual do criador | 23,4% |
| 5× ou mais | 8,1% |
| 10× ou mais | 3,3% |

### Por número de slides

| Slides | Carrosséis | Dobraram | Score mediano |
|---|---|---|---|
| 2–3 | 1.760 | 18,2% | 0,90× |
| 4–5 | 2.423 | 21,0% | 0,90× |
| 6–7 | 4.690 | 22,5% | 0,90× |
| 8–9 | 3.878 | 24,5% | 0,90× |
| 10 | 1.658 | 26,0% | 1,00× |
| 11–15 | 2.801 | **26,3%** | 1,00× |
| 16–20 | 1.005 | 25,9% | 1,00× |

Carrossel curto (2–3) é o pior grupo. A faixa 10–15 é a melhor. Nosso app vai de 3 a 10
cards, então **10 é o nosso teto útil** — o formato deve ser escrito para caber em 10 sem
sobrar slide de enfeite.

### Por formato

| Formato | Carrosséis | Dobraram | Score mediano |
|---|---|---|---|
| Reference (cheat sheet) | 194 | **32,0%** | 1,15× |
| Quiz | 263 | 26,6% | 0,90× |
| List | 6.653 | 25,8% | 1,00× |
| How-to | 1.492 | 24,5% | 0,90× |
| Opinion | 3.032 | 23,4% | 0,90× |
| Story | 2.063 | 23,4% | 0,90× |
| Case study | 841 | 22,7% | 0,90× |
| News | 1.381 | 18,9% | 0,80× |
| Showcase | 2.113 | 18,5% | 0,80× |

Reference é o melhor formato e o mais raro (0,9% da amostra). List é o mais comum e ainda
assim acima da média — por isso é o default de qualquer gerador.

### O primeiro slide (medido em 13.087 carrosséis com texto legível)

| Primeiro slide | Carrosséis | Dobraram | Score mediano |
|---|---|---|---|
| **6–10 palavras** | 4.411 | **25,3%** | 0,90× |
| 11–15 palavras | 3.045 | 22,9% | 0,90× |
| 1–5 palavras | 2.104 | 22,2% | 0,90× |
| 16–25 palavras | 2.317 | **20,1%** | 0,90× |
| 26+ palavras | 1.210 | 21,3% | 0,90× |

| Primeiro slide | Dobraram |
|---|---|
| **Afirmação** | **23,2%** |
| Pergunta | 19,5% |
| Caixa alta | 22,5% |
| Caixa normal | 23,1% |
| Tem número | 24,1% |
| Sem número | 22,4% |

**Regras que saem daí, medidas e não estilísticas:**
1. Hook de **6 a 10 palavras**. Acima de 15 palavras a chance de dobrar cai.
2. **Afirmação bate pergunta.** "Pergunta no slide 1" é conselho ruim: 19,5% contra 23,2%.
3. **Caixa alta não ajuda** (22,5% contra 23,1%). Ênfase se faz com palavra, não com CAPS.
4. Número ajuda de leve (24,1% contra 22,4%) — e o site avisa que "tem número" conta até
   contador de slide, então nem todo ponto aqui é mérito do número.

### Por nicho (dobraram o usual)

| Nicho | Dobraram | Score mediano |
|---|---|---|
| Productivity | 30,7% | 1,05× |
| Education | 28,2% | 1,00× |
| Relationships | 27,9% | 1,00× |
| Design | 26,7% | 1,00× |
| History & culture | 26,1% | 0,90× |
| Food & cooking | 25,9% | 0,90× |
| AI & tech | 23,8% | 0,90× |
| Entertainment | 23,7% | 1,00× |
| Content creation | 23,6% | 0,90× |
| Personal finance | 23,4% | 0,90× |
| Art & photography | 22,7% | 0,80× |
| Mindset & motivation | 22,5% | 1,00× |
| Business & marketing | 22,4% | 0,90× |
| Health & fitness | 22,0% | 0,90× |
| Psychology | 21,2% | 0,90× |
| Fashion & beauty | 18,2% | 0,90× |
| Lifestyle & travel | 17,6% | 0,80× |

Leitura para o nosso caso (clínica de estética): **Fashion & beauty é o nicho mais difícil
da lista** (18,2%) e Health & fitness fica em 22,0%. Ou seja: o tema não se salva pelo nicho,
se salva pelo formato e pelo hook. É exatamente onde o nosso carrossel estava falhando.

---

## 1. Os 9 formatos

Estrutura de cada um é a que o site publica na página do formato ("How a X carousel is
built"); tamanho é o "slides, typically" da mesma página; nichos são os que o site lista na
página do formato com contagem e mediana do nicho.

### 1.1 List — "Lista numerada" [nosso rótulo]

- **Estrutura** (fonte: `/carousel-examples/list`)
  1. Slide 1: a promessa, normalmente com número ("7 ferramentas que…")
  2. Slides 2..N: um item por slide, título curto + uma linha do porquê
  3. Último: recapitulação, ou motivo para salvar/seguir/comentar
- **Tamanho típico:** 8 slides (46% usam 6–8)
- **Bib.:** 3.141 posts, mediana 2,0×; 25,8% dobraram (6.653 na amostra completa)
- **Nichos onde aparece mais:** mindset & motivation (435 · 1,8×), ai & tech (420 · 2,2×),
  content creation (368 · 1,8×), design (332 · **2,7×**), business (298 · 2,0×),
  health & fitness (193 · 1,9×), productivity (69 · **3,1×**), food (120 · 2,4×),
  personal finance (74 · 2,2×), education (161 · 2,1×)
- **Hooks reais (transcritos do slide, com @ e score):**
  - "4 unexpected wedding colors I find extremely chic" — @lesaimantsbridal · 8.471×
  - "Non-traditional things we did at our wedding that saved us money" — @weddings.onpoint · 799×
  - "5 WEDDING MISTAKES most couples make" — @ivy.eventideas · 574×
  - "100 CHATGPT CODE" — @smrt.cc · 306×
  - "THE BEST COLOR COMBOS are inspired by nature" — @reynardlowell · 252×
  - "I just turned 66. Here are 5 things I wish I knew at 26..." — @drmarkhyman · 17× (health)
  - "never run a marathon until you read this" — @thepaceproject_ · 8,7× (health)
- **Por que o hook funciona** [inferência sobre os hooks acima]: o número é uma promessa
  contável (o leitor sabe o tamanho do compromisso), e o item é **específico e
  quase-errado** ("wedding colors I find extremely chic" é opinião assumida; "misconceptions"
  implica que o leitor está errado hoje). Hook genérico ("dicas para casar melhor") não
  aparece nessa lista porque não é o que funcionou.

### 1.2 How-to — "Passo a passo" [nosso rótulo]

- **Estrutura** (fonte: `/carousel-examples/how-to`)
  1. Slide 1: o resultado que o leitor vai conseguir
  2. Slide 2: o que precisa, ou o erro que quase todo mundo comete
  3. Meio: um passo por slide, em ordem
  4. Último: o resultado final + pedido para salvar
- **Tamanho típico:** 8 slides (45% entre 6–8, 40% entre 9–12)
- **Bib.:** 658 posts, mediana 2,0×; 24,5% dobraram
- **Nichos:** ai & tech (163 · 2,1×), content creation (154 · 2,1×), business (66 · 1,9×),
  productivity (32 · **2,9×**), relationships (24 · **3,0×**), health & fitness (31 · 1,9×),
  food (37 · 2,3×), education (31 · 2,1×), personal finance (21 · 1,9×)
- **Hooks reais:**
  - "How to Manage multiple passions:" — @jackconrs · 435×
  - "People are using Claude to fix their slow Wi-Fi" — @itsnextwork · 139×
  - "How to find time for everything with a 9-5 (it's not about waking up earlier)" — @themiagabriella · 93×
  - "how to get 100 NEW FOLLOWERS every day" — @ginnyfears · 40×
- **Por que o hook funciona** [inferência]: o parêntese é a arma. "(it's not about waking up
  earlier)" nega o conselho óbvio e cria tensão antes do primeiro swipe. "People are using
  Claude to fix their slow Wi-Fi" funciona por prova social + problema concreto e pequeno.

### 1.3 Case study — "Um caso real" [nosso rótulo]

- **Estrutura** (fonte: `/carousel-examples/case-study`)
  1. Slide 1: o resultado, de preferência com número
  2. Slides 2–3: o ponto de partida e o problema
  3. Meio: o que fizeram, uma decisão por slide
  4. Último: a lição que o leitor leva
- **Tamanho típico:** 8 slides (30% entre 6–8, 30% entre 9–12)
- **Bib.:** 344 posts, mediana 1,9×; 22,7% dobraram
- **Nichos:** business (137 · **2,2×**), content creation (51 · 1,9×), personal finance
  (31 · 2,0×), health & fitness (21 · 1,9×)
- **Hooks reais:**
  - "she made $85,235 in two weeks. Nina is an ER nurse with $150,000 in student loans." — @stanforcreators · 34×
  - "The birthday taps It sounded ridiculously obvious." — @jasonrewired_ · 20×
  - "Runner legs are a cheat code" — @papanca.io · 13×
  - "BRAND CASE STUDY: Dolly Parton Built A $450 Million Brand by Never Rebranding." — @camillemoore · 14×
- **Por que o hook funciona** [inferência]: número específico e improvável ($85.235, não
  "muito dinheiro") + contraste de identidade (enfermeira da emergência com dívida). O leitor
  não acredita na promessa genérica, acredita no detalhe que ninguém inventaria.
- **Aviso de honestidade:** o formato exige caso real. Se não houver número real, este
  formato não serve — inventar número é o que mais destrói confiança no nicho de saúde.

### 1.4 Story — "História com virada" [nosso rótulo]

- **Estrutura** (fonte: `/carousel-examples/story`)
  1. Slide 1: o momento de tensão, ou o fim surpreendente
  2. Meio: o que aconteceu, uma cena por slide
  3. Penúltimo: a virada / a percepção
  4. Último: o que isso significa para o leitor
- **Tamanho típico:** 9 slides (24% entre 13–20 — o formato que mais usa carrossel longo)
- **Bib.:** 903 posts, mediana 1,9×; 23,4% dobraram
- **Nichos:** mindset (174 · 2,0×), business (149 · 1,9×), relationships (146 · 2,0×),
  lifestyle & travel (100 · 1,7×), health & fitness (42 · 1,8×)
- **Hooks reais:**
  - "I'm not saying we SHOULD, but.." — @lexilaube · 193×
  - "November 2026 Some days, I miss Peru like it was a person." — @madlertravel · 135×
  - "When you're exhausted after a whole day of travel but still can't miss a 'picture spot'" — @impactmediahouse · 90×
  - "Only two generations ago, this was Dubai." — @qissagoi.ae · 26×
  - "3 days in hospital in Emergency Cardiac ward for what was thought to be a potential heart attack" — @coachmarkcarroll · 15× (health)
- **Por que o hook funciona** [inferência]: frase cortada ou cena concreta. O leitor não
  recebe a lição, recebe o meio da história — e o swipe é o que resolve a falta.

### 1.5 Opinion — "Opinião que divide" [nosso rótulo]

- **Estrutura** (fonte: `/carousel-examples/opinion`)
  1. Slide 1: a tese, dita sem rodeio
  2. Slides 2–3: por que a maioria acredita no contrário
  3. Meio: seus motivos e evidências
  4. Último: a pergunta que convida a responder
- **Tamanho típico:** 7 slides (33% entre 6–8)
- **Bib.:** 1.321 posts, mediana 2,0×; 23,4% dobraram
- **Nichos:** mindset (407 · 1,8×), business (184 · 1,9×), content creation (149 · 2,1×),
  relationships (140 · 2,2×), psychology (95 · 2,0×), health & fitness (57 · **2,2×**),
  personal finance (36 · **2,5×**), design (58 · 2,2×)
- **Hooks reais:**
  - "Matcha didn't go viral because of its taste. IT WENT VIRAL BECAUSE IT LOOKED GOOD." — @qissagoi.ae · 104×
  - "The average millionaire is 57. Not 23." — @creatorkarro · 90×
  - "An organized creative is VERY dangerous." — @crsnscott · 87×
  - "Why Coffee Is the Most Misunderstood Beverage in the World." — @bevarabia · 122×
  - "It could be the beginning of perimenopause." — @the_female_lead · 8,7× (health)
  - "Fake ADHD vs Real ADHD" — @myadhdventure · 23× (psychology)
- **Por que o hook funciona** [inferência]: nega uma crença que o leitor tem e não sabia que
  tinha ("o matcha ficou viral pelo visual"), ou corrige um número que o leitor assume
  errado ("o milionário médio tem 57, não 23"). A tensão é intelectual, não emocional — e
  é o formato que mais gera comentário.
- **Nota de ouro:** "The average millionaire is 57. Not 23." apareceu em duas contas
  diferentes com 90,1× e 18,8× (o próprio site cita isso). **O padrão de hook é portátil
  entre contas** — é a base da nossa biblioteca.

### 1.6 Reference — "Cheat sheet que se salva" [nosso rótulo]

- **Estrutura** (fonte: `/carousel-examples/reference`)
  1. Slide 1: o que o guia cobre e para quem
  2. Meio: informação densa e escaneável, layout consistente
  3. Último: lembrete para salvar
- **Tamanho típico:** 7 slides (41% entre 6–8)
- **Bib.:** 100 posts, mediana **2,5×**; **32,0% dobraram — o melhor formato medido**
- **Nichos:** content creation (13), food (13), business (12 · 1,4×). É raro em todos.
- **Hooks reais:**
  - "You recognize this brand But if you change the color.." — @reputeforge · 9,6×
  - "canva elements [ cheatsheet ] [ free version ]" — @yalejeannette · 9,3×
  - "STOP ORDERING THE WRONG COFFEE. A COFFEE GUIDE THAT MIGHT SAVE YOUR NEXT CAFÉ ORDER." — @sevenseeds.coffee · 9,2×
- **Por que o hook funciona** [inferência]: promete algo que se guarda. Aqui o objetivo é
  salvamento, não like — e o Instagram trata salvamento como sinal forte. Para clínica de
  estética é o formato mais subusado: tabela de "o que fazer em cada tipo de pele" ou
  "o que perguntar antes de fechar um procedimento".

### 1.7 News — "Novidade do nicho" [nosso rótulo]

- **Estrutura** (fonte: `/carousel-examples/news`)
  1. Slide 1: a notícia em uma linha
  2. Slide 2: o que mudou exatamente, com print
  3. Meio: quem é afetado e o que fazer
  4. Último: sua leitura, ou pedido para seguir
- **Tamanho típico:** 5 slides (51% entre 2–5 — o mais curto de todos)
- **Bib.:** 481 posts, mediana 1,9×; 18,9% dobraram (penúltimo pior)
- **Nichos:** business (142), entertainment (63), ai & tech (53)
- **Hooks reais:**
  - "THE US MIDTERMS JUST MADE HISTORY." — @femaleinvest · 45×
  - "NEW INSTAGRAM NOW CONNECTS TO CLAUDE. SWIPE TO SEE WHAT IT DOES →" — @jayantcreates.ai · 19×
  - "BEAUTYINC WWD EXCLUSIVE 'Love Island USA' Star Jana Craig Launches New Lash Line" — @beautyinc · 150×
- **Por que o hook funciona** [inferência]: urgência real ("JUST", "NOW"). Ganha na
  velocidade e perde rápido quando envelhece.
- **Para o nosso produto:** o app não tem feed de notícia (decisão da issue #8). Este formato
  só entra se o usuário trouxer a novidade no tema. Não é default e não vale como
  recomendação principal em estética.

### 1.8 Showcase — "Antes e depois / visual" [nosso rótulo]

- **Estrutura** (fonte: `/carousel-examples/showcase`)
  1. Slide 1: a imagem mais forte, às vezes com título curto
  2. Meio: uma imagem por slide, em ordem que constrói interesse
  3. Último: um detalhe, um antes e depois, ou os créditos
- **Tamanho típico:** 8 slides
- **Bib.:** 706 posts, mediana 1,8×; 18,5% dobraram — **o pior formato medido**, e o mais
  usado em design (243), fashion & beauty (106), art & photography (92)
- **Hooks reais:**
  - "wanat realtors group" — @del_wanat · 210×
  - "Italian Outfits for Men" — @riccardorricciclothing · 129×
  - "FIELD MICE TAKE NAPS IN FLOWERS WHEN THEY GET TIRED" — @mindset.therapy · 81×
  - "This girl's crochet pieces are insane." — @wegotnotaste · 42×
- **Por que o hook funciona** [inferência]: o texto é mínimo porque a imagem é o hook. Quando
  o texto carrega a promessa ("Este girl's crochet pieces are insane"), ele funciona como
  legenda de choque, não como título.
- **Leitura para estética:** antes e depois é o formato que a clínica mais quer usar, e é o
  que tem a **pior** taxa medida. Serve quando a foto é boa; como default, prejudica.

### 1.9 Quiz — "Escolha o seu" [nosso rótulo]

- **Estrutura** (fonte: `/carousel-examples/quiz`)
  1. Slide 1: a pergunta ou o jogo ("Qual é o seu?")
  2. Meio: as opções, uma por slide ou todas juntas
  3. Último: as respostas, ou pedido para comentar a escolha
- **Tamanho típico:** 11 slides (35% entre 13–20)
- **Bib.:** 118 posts, mediana 2,2×; 26,6% dobraram (2º melhor)
- **Nichos:** design (24), entertainment (23), education (14)
- **Hooks reais:**
  - "2026 WEDDING COLOUR THEME TRENDS" — @olijvenkraalweddings · 262×
  - "Your birth month = Your british food" — @vibefiesta · 8,3×
  - "Women born in these months are exactly who they say they are." — @bossbabe.inc · 8,3×
  - "The coffee person starter pack (Choose your fighter.)" — @sevenseeds.coffee · 7,1×
- **Por que o hook funciona** [inferência]: o leitor precisa chegar no fim para saber onde
  ele se encaixa. Gera comentário porque a resposta é pública.
- **Para estética:** "qual é o seu tipo de pele / seu perfil de pele" é quiz honesto e
  altamente salvável. É o formato que mais gera comentário — e comentário é o que o
  algoritmo mais paga.

---

## 2. Padrões de hook que atravessam formatos

Transcritos dos hooks reais acima; agrupados por mecânica. **[nosso agrupamento]** — o site
não publica esta taxonomia, ele publica os hooks.

| Padrão | Exemplo real | Score |
|---|---|---|
| Número + substantivo concreto | "5 WEDDING MISTAKES most couples make" | 574× |
| Correção de crença com número | "The average millionaire is 57. Not 23." | 90× |
| Negação do conselho óbvio (parêntese) | "How to find time for everything with a 9-5 (it's not about waking up earlier)" | 93× |
| Choque de identidade | "she made $85,235 in two weeks. Nina is an ER nurse with $150,000 in student loans." | 34× |
| Cena no meio (frase cortada) | "I'm not saying we SHOULD, but.." | 193× |
| Fato + inversão de causa | "Matcha didn't go viral because of its taste." | 104× |
| Ameaça silenciosa / diagnóstico | "It could be the beginning of perimenopause." | 8,7× |
| Comparação em duas palavras | "Fake ADHD vs Real ADHD" / "Burnout vs tired" | 23× / 12× |
| Objeto reconhecível + promessa | "canva elements [ cheatsheet ] [ free version ]" | 9,3× |

**Contra-padrões medidos** (o que o nosso carrossel estava fazendo): pergunta no slide 1,
caixa alta, mais de 15 palavras, e promessa de conteúdo genérica ("promoção no grupo",
"dicas para fidelizar") — nenhum destes aparece na lista de nada que performou.

---

## 3. Como isso vira o nosso produto

**[nosso]** Rótulos em português e exemplos de uma linha são nossos, para o usuário leigo
escolher por nome humano. A estrutura e a evidência de cada formato continuam as de cima.

| Formato no app | Formato de origem | Exemplo de uma linha [nosso] |
|---|---|---|
| Lista numerada | List | "5 erros que fazem a cliente não voltar" |
| Passo a passo | How-to | "Como fazer a cliente voltar em 30 dias" |
| Um caso real | Case study | "Ela tinha 40% da agenda vazia. Em 2 meses, fila de espera" |
| História com virada | Story | "A cliente que sumiu por 8 meses e voltou" |
| Opinião que divide | Opinion | "Fidelidade não se compra com desconto" |
| Cheat sheet que se salva | Reference | "O que perguntar antes de fechar um procedimento" |
| Novidade do nicho | News | "O que mudou no Instagram e afeta a sua clínica" |
| Antes e depois | Showcase | "Antes e depois: pele com acne" |
| Escolha o seu | Quiz | "Qual é o seu tipo de pele?" |

**Ordem de recomendação [nosso, guiada pelos números]:** Cheat sheet (32% dobraram) e Quiz
(26,6%) acima de Lista (25,8%); Antes e depois por último (18,5%). Mas Lista é o default
porque aceita qualquer assunto e é o que o usuário reconhece.

**Regras de escrita derivadas dos dados, não do gosto:**
1. Slide 1: **afirmação**, 6 a 10 palavras, sem CAPS, com número quando ele for honesto.
2. O hook nomeia o **inimigo ou o erro**, nunca o serviço. "Promoção no grupo" é o serviço
   falando; "5 erros que fazem a cliente não voltar" é a dor falando.
3. Uma ideia por slide. 10 cards é o nosso teto; melhor 8 cheios que 10 com 2 de enfeite.
4. Último slide: uma ação só, e ela **não** é "arraste para o lado" (o leitor já arrastou
   até ali). É salvar, comentar a escolha, ou chamar no direct.
5. Se não há número real, o formato não é Case study. Inventar número em saúde é o erro mais
   caro que existe neste nicho.

---

## 4. Revisão do critic (22/11/2026) — o que mudou por causa dela

O catálogo acima e o prompt novo foram submetidos **uma vez** ao critic (perfil isolado,
processo separado, modelo do combo `critic`). Ele devolveu 8 pontos, 5 bloqueantes. O que
foi adotado, e o que não foi:

### Adotado

| Ponto do critic | O que fizemos |
|---|---|
| **Etapa 3 contraditória**: regras de "como escrever o gancho" estavam no prompt que é proibido de mexer no gancho | As regras, o anti-exemplo e os padrões do formato migraram para a **etapa 1**, que é onde o gancho nasce. A etapa 3 recebe o gancho pronto e só o fatia em título + subtítulo |
| **Contradição do linter**: "6 a 10 palavras na capa" x "todo slide com corpo de 8 palavras" | Era impossível cumprir. O linter passou a tratar a capa como exceção (corpo mínimo de 8 caracteres, aviso acima de 14 palavras no total). **Essa era a causa raiz do hook ruim**: o modelo enchia a capa para passar no portão |
| **Quiz x regra de afirmação** | `regrasDoGancho` é condicional: quiz pode abrir com pergunta (a estrutura publicada é "a pergunta ou o jogo"); todo o resto não |
| **Palavras do estudo são em inglês** | Faixa em pt-BR virou **6 a 12 no título, teto de 14 no total**. Marcado como adaptação nossa, com o número original ao lado |
| **Taxa de caixa alta é ruído** (22,5% x 23,1%) | A proibição de CAPS continua como regra de desenho, mas o prompt não a apresenta mais como evidência |
| **Mediana da biblioteca ≠ população** | O documento e o app passaram a citar o percentual da **amostra total** (ex.: 25,8% de 6.653) e a chamar a mediana da biblioteca de "biblioteca curada (subconjunto)" |
| **Célula com n pequeno** | Formatos com menos de 30 posts no nicho aparecem com "amostra pequena"; Reference (194 na amostra inteira) entra como indício, não como garantia |
| **Antes e depois em saúde** | O limite do formato agora avisa que conselho profissional (CFM/CFO) e a política de imagem do Meta restringem antes/depois de paciente |
| **Referência real em inglês no prompt** | Removida da etapa 3. Os `padroes` em pt-BR (escritos por nós) ficam na etapa 1 |
| **Default cego no formato do nicho** | `resolverFormato` passou a sugerir pelo **tema** (heurística determinística), não pela mediana do nicho — senão tudo viraria cheat sheet |
| **Vitrine de 108 combinações** | A tela mostra até 4 formatos com o sugerido marcado, o resto atrás de "ver todos"; "Novidade" e "Antes e depois" ficam fora da lista curta |

### Adotado em parte

- **"3 candidatos de gancho + filtro determinístico" (ponto 9, o de maior alavancagem):**
  adotado. A etapa 1 devolve três candidatos, e `escolherGancho()` reprova pergunta (fora do
  quiz), chamada de arrasto/promoção e gancho acima de 14 palavras; entre os aprovados
  pontua número, cena concreta, negação e vocabulário de nicho. Sem chamada extra de modelo.
- **"Banco de vocabulário concreto por nicho":** adotado (`VOCABULARIO_POR_NICHO`, 12 nichos).
  É vocabulário, não dado: nenhum número, nada que o modelo possa citar como pesquisa.
- **"Slide 2 entrega payoff, não aquecimento":** adotado como regra no prompt.
- **"Esconder News e Showcase":** adotados atrás de "ver todos", com o motivo escrito na tela.
  Não apagados: quem procura de propósito continua achando.

### Não adotado, e por quê

- **"Banir globalmente o formato News e Showcase"**: o produto não tem feed de notícia, mas
  o usuário pode digitar uma novidade real no tema. Esconder da lista curta resolve o risco
  (o modelo inventaria notícia) sem tirar a opção de quem tem o fato na mão.
- **"Audience inversion é bug bloqueante do pipeline"**: o diagnóstico é correto, a correção
  proposta (uma etapa nova de desambiguação) não é necessária — o mesmo resultado sai de uma
  instrução explícita na etapa 1: "publico é QUEM LÊ, não quem publica". Uma etapa a mais é
  uma chamada a mais por carrossel.
- **"Playlist de 3–4 pills"** virou 4 + expansor, em vez de esconder o resto por completo: a
  biblioteca é parte do que o produto vende.

### O que o critic acertou que eu não tinha visto

O linter era o culpado do hook ruim, não o prompt. Enquanto o portão exigia 8 palavras de
corpo em **todo** slide, todo modelo obediente escrevia capa longa. A correção do prompt
sozinha não teria resolvido — o teste de `lint-carrossel` com a capa de 17 palavras é a prova
que fica no repo.
