# Fase 1 — tela inicial: decisões e divergências

Escrito em 12/11/2026, junto com o código da fase 1 do `PLANO-UI-CARROSSEL.md`.
O plano é a spec. Este arquivo registra o que o plano não decidia, o que a API de
hoje não permite, e o que fica para a fase 2 — para ninguém descobrir isso lendo
um teste vermelho depois.

## 1. O que esta fase entrega

- `/` — tela inicial de carrosséis: abas com contagem, busca, filtros (aba,
  estado exato, fonte, período), ordenação, paginação de 24, ações em lote,
  quatro estados.
- `/carrossel/<id>` — ficha da peça (o palco de aprovação é fase 2).
- `/carrossel/<id>/editar` — o editor, que saiu de `/`.
- `/sinais` — a antiga `/fila`, com a navegação compartilhada.
- `301`: `/projetos` → `/`, `/?projeto=<id>` → `/carrossel/<id>`, `/fila` → `/sinais`.
- `/projetos` e o cartão antigo (`components/galeria/cartao-projeto.tsx`) foram
  apagados: a lista virou a tela inicial, com estado de verdade e capa real.

## 2. Decisões tomadas onde o plano não fechava

| # | Situação | Decisão | Por quê |
|---|---|---|---|
| 1 | §8.1 item 9 usa `?estado=vazio\|carregando\|erro` e §2.3 usa `?estado=` para os seis estados reais | Os dois convivem no mesmo parâmetro; os três valores de dev só são aceitos quando `ESTADOS_DEV=1` (ou em `next dev`) | Os conjuntos não colidem (`a_produzir` ≠ `erro`), e o portão impede que `?estado=erro` vire ferramenta de produção |
| 2 | §2.5 "seleção por checkbox no toque longo no mobile" | Checkbox sempre visível no mobile; no desktop aparece no hover e no foco | Toque longo não tem gesto padrão na web e disputa com o menu de contexto; esconder o único caminho para a ação em lote no celular seria pior. Alvo de 44 px preservado |
| 3 | §2.1 pede "meta 5" no subtítulo | Subtítulo mostra `N para aprovar · N aprovadas · N publicadas`, sem meta | `meta_posts_semana` é coluna da fase 3/6 (`conteudo_config` não a tem ainda). Inventar a meta no cliente seria número falso |
| 4 | §2.3 define ação primária por estado (Gerar/Completar/Aprovar/Baixar) | Só `Gerar` executável nesta fase; os demais estados abrem a ficha | Aprovar/baixar dependem do palco da fase 2. Botão que promete e não faz é pior do que botão que leva ao lugar certo |
| 5 | §1.4 "Novo abre o editor com 1 slide em branco" | `POST /carrosseis` com documento de 1 slide, depois navega ao editor | `estadoInicial` da API deriva de ter slide, então o carrossel novo nasce `pronta`, não `a_produzir` (ver divergência D3) |

## 3. Divergências — o que o plano pede e a API de hoje não entrega

A API no commit `cf717c1` (rodando) devolve, em `GET /api/carrossel/carrosseis`:
`id, titulo, versao_atual, publico_ativo, estado, estado_em, slug, capa, lint,
criado_em, atualizado_em, autor_id, autor_nome, autor_email, slides`.

**D1 — Busca no servidor (§2.4).** O plano pede `?q=` no servidor. A rota não lê
query string: devolve sempre a lista inteira (teto de 200 linhas), sem
paginação, contagem ou filtro. Nesta fase a busca, a ordenação, os filtros e a
paginação rodam **no cliente**, sobre essa resposta única, em funções puras
(`src/lib/carrosseis/lista.ts`). O que muda quando a API aceitar os parâmetros é
só o corpo de `carregar()`: a URL da tela já é a fonte da verdade (`?q=`,
`?aba=`, `?estado=`, `?ordem=`, `?pagina=`), então o endereço e o comportamento
visível não mudam. O teto de 200 é da própria API, então filtrar no cliente não
esconde nada do que o servidor entregaria.

**D2 — Campos do cartão que não existem na API (§2.2, linhas 3 e 4).** O cartão
está implementado para `pauta_titulo`, `legenda`, `hashtags` e `fotos`, mas a API
não devolve nenhum deles (`pauta_id`/`sinal_id` não existem na tabela; legenda é
fase 4). A linha 3 mostra só a etiqueta de estado e a linha 4 não aparece — que é
exatamente o que a §2.2 manda quando o dado não existe. Quando a API passar a
devolver, a tela exibe sem mudança de código.

**D3 — Transições de estado (§2.3, §2.5).** Não existe endpoint para mudar
`estado`: `PATCH /carrosseis/<id>` só move `a_produzir → pronta` (via documento) e
`POST /carrosseis/aprovar` **não existe**. Consequências nesta fase:

- `Aprovar N` chama `POST /api/carrossel/carrosseis/aprovar` como o plano define
  e, recebendo 404/405, mostra a faixa de erro dizendo que a rota falta. Nada é
  aprovado em silêncio.
- `Marcar publicado` chama `PATCH /carrosseis/<id>` com `{publicada_em, estado}` e
  hoje cai no mesmo aviso.
- `Excluir N` **funciona** (o `DELETE` por id existe) e pede confirmação em dois
  passos.

**D4 — ZIP em lote (§2.5).** O botão está na barra, desabilitado, com o motivo no
`title`. O export hoje é client-side (`html-to-image` + JSZip) e imprime o
documento aberto no editor; fazer N carrosséis exigiria render de N documentos
fora de tela. Isso pertence à fase 2/5, junto com o render no servidor
(`carrossel_artefatos`).

**D5 — Critério 8 (409 de `max_por_dia`).** A tela mostra a mensagem do servidor
quando a geração responde 409 — provado no teste com 409 mockado. A API em
`cf717c1` não tem rota de geração por carrossel, e o teto `max_por_dia` só existe
no cron `rodarFilaDiaria`, que devolve `motivo: 'limite diário atingido'` com
status 200 — não 409. Enquanto a rota não existir, o critério está cumprido na
tela e pendente no servidor.

**D6 — Critério 5 ("SQL conferido contra a tela").** A produção tem **1**
carrossel (`estado='pronta'`). A metade da tela é provada com fixture de 3 + 2
(`tests/visual/inicio.spec.ts`); a metade do banco é o `select` rodado na mesma
rodada e registrado no relatório. Nenhuma linha é escrita em produção para fazer
teste.

## 4. Como os quatro estados são alcançados em dev

```
/                → lista (dados reais ou mock)
/?estado=vazio    → "Nenhum carrossel ainda" + [Ver sinais] [Novo]
/?estado=carregando → seis skeleton com a geometria do cartão
/?estado=erro     → faixa #B91C1C sobre #FEF2F2 + "Tentar de novo"
```

Portão: em `next start` (NODE_ENV=production) os três valores exigem
`ESTADOS_DEV=1` no ambiente do servidor — é o que o `playwright.config.ts` faz.
Em `next dev` já estão liberados.

## 5. O que a fase 2 herda daqui

- `/carrossel/<id>` é só ficha: palco, filmstrip, rail, aprovar/rejeitar com
  motivo, pacote ZIP e histórico de versões são da fase 2 (§3).
- Os botões `Aprovar N` e `Marcar publicado` passam a funcionar quando a API
  ganhar `POST /carrosseis/aprovar` e a transição de `publicada_em`.
- `pauta_titulo`, `legenda`, `hashtags` e `fotos` entram no cartão sem mudança de
  componente, quando a API os devolver.
