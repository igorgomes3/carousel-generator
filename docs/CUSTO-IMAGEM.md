# Custo por imagem — CONTENTX (25/11/2026)

Este documento responde uma pergunta de negócio: **quanto custa cada capa gerada**. Ele existe porque o 9Router registra `cost = 0` para imagem (a tabela `open-sse/providers/pricing.js` não tem nenhuma entrada `gpt-image*`), e "zero" não serve para precificar.

## O que o sistema usa hoje

- Modelo: `cx/gpt-image-2.5` via 9Router (provider `codex`, OAuth de conta **ChatGPT Plus**).
- Tamanho padrão: **1088×1360** (4:5, o mesmo recorte do card 1080×1350).
- Uma geração = uma capa. O autopilot **não** gera imagem em background (decisão de custo): a capa sai on-demand quando a pessoa abre o post.

## Evidência coletada

1. **9Router/ledger** (`usageHistory`): 5 gerações reais em 25/11, todas `status=success`, `cost=0`. Tokens registrados (`prompt ~2.2k`, `completion ~90`) descrevem o payload em texto, não o custo de imagem — não dá para derivar preço daí.
2. **OpenAI — limites do Codex**: no Plus, o uso é uma **janela móvel de 5 horas** (com um teto semanal por cima). A própria documentação diz que **geração de imagem consome a cota "3 a 5× mais rápido"** que um turno de texto equivalente. A estimativa de "1% da janela por imagem" que circulou antes implicaria ~100 imagens por janela de 5 h — incompatível com o fator 3–5× publicado, e não foi observada: em ~1 h de testes geramos 5 imagens sem qualquer sinal de limite.
3. **OpenAI — preço de API** (`gpt-image-2`, tabela oficial por imagem):

| Qualidade | 1024×1024 | 1024×1536 (retrato) |
|---|---|---|
| low | US$ 0,006 | US$ 0,005 |
| medium | US$ 0,053 | US$ 0,041 |
| high | US$ 0,211 | US$ 0,165 |

O nosso 1088×1360 fica entre o quadrado e o retrato → **medium ≈ US$ 0,045–0,053**, **high ≈ US$ 0,17–0,21**.

## Os três números que importam

| Cenário | Como se calcula | US$ por imagem |
|---|---|---|
| **Marginal (API equivalente)** | preço de tabela `gpt-image-2` medium no retrato | **0,041 – 0,053** |
| **Amortizado do plano** | US$ 20/mês ÷ capacidade realista (3–13 imagens por janela de 5 h → 430–1.900/mês) | **0,010 – 0,046** |
| **Pior caso (plano apertado)** | se a janela entregar só ~2 imagens | **≈ 0,14** |

**Número recomendado para precificar: US$ 0,05 por imagem** (≈ R$ 0,27 a R$ 5,40/US$).
Motivo de usar o topo do intervalo amortizado: o custo real do plano não é linear, a conta pode mudar de plano sem aviso, e subestimar custo em produto de assinatura é o erro que só aparece no fim do mês.

## O que isso significa para o produto

- Um carrossel de 6 cards com **1 capa** ≈ US$ 0,05 de imagem.
- O mesmo carrossel com **6 capas** ≈ US$ 0,30 — 6× mais caro pelo mesmo texto. É por isso que "repetir a capa em todos os cards" existe e é o padrão recomendado.
- Autopilot diário, 1 perfil, capa on-demand: **US$ 1,50/mês** no pior caso de uso diário com capa (30 × 0,05). Sem abrir o post, custo de imagem = 0.
- Se 20 perfis usarem todo dia com capa: **US$ 30/mês** em imagem — acima do valor do próprio plano Plus, e é o sinal de quando migrar para API paga por uso.

## Premissas e limites desta conta

- O fator 3–5× é a informação pública da OpenAI; a capacidade exata por janela não é publicada e varia com modelo, contexto e ferramentas.
- Preço de API muda; a tabela acima é a de 25/11/2026 (`developers.openai.com/api/docs/guides/image-generation`).
- Não inclui custo de texto (LLM), que hoje roda em outro provedor e é medido separadamente.
