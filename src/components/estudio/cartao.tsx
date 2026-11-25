"use client";

/**
 * Um card do carrossel, desenhado no tamanho final da ART E (1080×1440, 3:4).
 *
 * Por que tamanho fixo e não CSS responsivo: o PNG precisa sair em 1080×1350
 * com a mesma quebra de linha que a pessoa viu. Se a prévia fosse fluida, o
 * export (que rasteriza o nó em tamanho real) sairia diferente da tela. Então o
 * card é sempre 1080×1440 e a prévia escala com `transform`.
 *
 * ## 3:4 de arte, 4:5 de janela (issue #12)
 *
 * O card desenha 1080×1440, e TODO texto senta dentro da janela 4:5
 * (1080×1350, centrada) — ver `@/lib/estudio/area-segura`. Os 45 px de cima e de
 * baixo são sangria: a foto e o gradiente invadem, o texto nunca. É o que faz o
 * PNG de 1080×1350 (a janela, recortada da arte) sair sem nada cortado.
 *
 * Por isso os números de layout abaixo aparecem como `SANGRIA + n` e não como
 * `n`: os valores são os de antes (80 do topo, 48 do pé), medidos na janela de
 * 1350. Somar a sangria é o que mantém o desenho idêntico ao que já existia,
 * agora com folga em cima e embaixo.
 *
 * Layout em FLUXO, não em camadas absolutas: a primeira versão ancorava título,
 * corpo e rodapé cada um no seu `bottom`, e quando a IA devolvia manchete de 4
 * linhas os três se atravessavam no PNG. Aqui a capa é uma coluna empilhada no
 * pé do card (manchete → apoio → barra), com o corpo do texto limitado por
 * `maxHeight`; o que não cabe é cortado, não sobreposto.
 *
 * ## Foto do card (issue #11)
 *
 * A foto que a pessoa sobe no passo 2 vira FUNDO do card — nos três tipos, não
 * só na capa. Antes a foto do card de conteúdo entrava como uma faixa de 380 px
 * no meio do texto, o que no PNG parecia adesivo colado. Agora é `object-fit:
 * cover` cobrindo o card inteiro com um véu escuro por cima; sem véu, título
 * branco sobre foto clara desaparece.
 *
 * Fallback em duas camadas, porque "nunca card quebrado" é o critério:
 *   1. sem foto → gradiente da paleta do template (o card nasce bonito, só sem
 *      imagem);
 *   2. foto que não carrega (`onError`) → o mesmo gradiente. O estado guarda a
 *      URL que falhou, não um booleano: quando a pessoa troca a foto, a nova
 *      URL é diferente e o card volta a tentar sozinho, sem efeito de reset.
 *
 * ## @ e estilo (issue #12)
 *
 * `arroba` desenha o handle do projeto em todos os cards. `aparencia` é o
 * template resolvido com a curadoria de fundo/destaque/fonte; sem ela, o card
 * usa o template — que é o caminho de todo projeto salvo antes desta issue.
 */
import { useState } from "react";

import type { SlideCarrossel } from "@/lib/estudio/tipos";
import { ART_H, ART_W, BLEED_Y, SAFE_AREA, SAFE_H } from "@/lib/estudio/area-segura";
import { arrobaVisivel } from "@/lib/estudio/arroba";
import { ENCAIXE } from "@/lib/estudio/encaixe";
import { corLegivelSobre, type Aparencia } from "@/lib/estudio/estilo";
import { pilhaFonte, type PaletteTemplate, type TemplateCarrossel } from "@/lib/templates";
import { BlocoTexto } from "@/components/estudio/bloco-texto";

export const LARGURA_CARD = ART_W;
export const ALTURA_CARD = ART_H;

/** Cor da guia: a mesma laranja de ferramenta de desenho, discreta sobre qualquer fundo. */
const COR_GUIA = "rgba(244, 81, 30, .95)";
/** Véu da sangria: laranja a 22% — lê em card claro E em card escuro. */
const VEU_SANGRIA = "rgba(244, 81, 30, .22)";

/** Véu da capa: forte embaixo (onde o texto senta), limpo em cima (onde a foto aparece). */
const VEU_CAPA =
  "linear-gradient(to top, rgba(0,0,0,.92) 0%, rgba(0,0,0,.55) 38%, rgba(0,0,0,0) 70%)";

/** Véu do card de conteúdo: o texto ocupa o card inteiro, então o véu também. */
const VEU_TEXTO =
  "linear-gradient(to top, rgba(0,0,0,.9) 0%, rgba(0,0,0,.66) 46%, rgba(0,0,0,.34) 100%)";

/** Fundo sem foto: cor sólida da paleta (o `backgroundColor` do card).
 *
 * Era um par de halos translúcidos (`accent55`, `muted22`) por cima da cor. O
 * dono do produto pediu sólido — o gradiente fazia o card parecer "imagem que
 * não carregou" e empatava com os cards que têm foto.
 */

interface Props {
  slide: SlideCarrossel;
  template: TemplateCarrossel;
  indice: number;
  total: number;
  /** Template + curadoria já resolvidos. Ausente = o próprio template. */
  aparencia?: Aparencia;
  /** Handle do projeto, com ou sem `@`. Vazio = card sem @. */
  arroba?: string | null;
  /**
   * Desenha a guia da área segura. Só a PRÉVIA liga isto — o palco de export
   * (`data-card-export`) passa `false`, senão a guia ia para dentro do PNG.
   */
  guia?: boolean;
}

/**
 * O alvo marca ênfase com `**palavra**` e sublinhado com `((U:palavra))` nos
 * samples dos templates — sintaxe do renderizador dele, não texto de gente.
 * Sem limpar, `((U:ESSE))` vazava literalmente na vitrine.
 */
function limparMarcacao(texto: string): string {
  return texto.replace(/\(\(U:([^)]+)\)\)/g, "$1").replace(/\*\*/g, "");
}

function comDestaque(texto: string, accent: string) {
  const partes = texto.split(/(\(\(U:[^)]+\)\)|\*\*[^*]+\*\*)/g).filter(Boolean);
  return partes.map((parte, i) =>
    parte.startsWith("((U:") || parte.startsWith("**") ? (
      <span key={i} style={{ color: accent }}>
        {limparMarcacao(parte)}
      </span>
    ) : (
      <span key={i}>{parte}</span>
    ),
  );
}

/** Manchete de capa: quanto mais longa, menor o corpo — evita 4 linhas de 116 px. */
function corpoDaManchete(titulo: string, grande: boolean): number {
  const n = limparMarcacao(titulo).length;
  const base = grande ? 116 : 104;
  if (n > 110) return Math.round(base * 0.62);
  if (n > 80) return Math.round(base * 0.72);
  if (n > 55) return Math.round(base * 0.84);
  return base;
}

/**
 * Guia da área segura — camada de TELA, nunca de arquivo.
 *
 * Duas linhas tracejadas na borda da janela 4:5 e uma faixa laranja a 22% sobre
 * a sangria: o que está na faixa é foto/gradiente, não é conteúdo.
 *
 * ## Espessura em pixels de ARTE, não de CSS
 *
 * Este bloco vive dentro do card, que é desenhado em 1080×1440 e escalado por
 * `transform` para ~300 px na tira. Uma linha de 1px de CSS aqui dentro viraria
 * 0,28 px na tela — invisível, e a primeira versão foi exatamente isso: o
 * seletor "Área segura 4:5" ligado e nada na tela. Por isso a linha tem 6 px de
 * arte (≈1,7 px de tela a 300 px) e o véu tem 22% de opacidade. A legenda "4:5"
 * NÃO mora aqui: ela é CSS na moldura da prévia (`Cartao`), porque texto de
 * 24 px de arte fica com 6 px na tela.
 */
function GuiaAreaSegura() {
  const linha = {
    position: "absolute" as const,
    left: 0,
    right: 0,
    height: 0,
    borderTop: `6px dashed ${COR_GUIA}`,
  };

  return (
    <div
      data-guia-area-segura
      aria-hidden
      style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
    >
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: 0,
          height: BLEED_Y,
          backgroundColor: VEU_SANGRIA,
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: BLEED_Y + SAFE_H,
          height: BLEED_Y,
          backgroundColor: VEU_SANGRIA,
        }}
      />
      <div style={{ ...linha, top: SAFE_AREA.y }} />
      <div style={{ ...linha, top: SAFE_AREA.y + SAFE_AREA.height }} />
    </div>
  );
}

export function CartaoCard({ slide, template, indice, total, aparencia, arroba, guia }: Props) {
  const { palette } = aparencia ?? template;
  const display = pilhaFonte(aparencia?.fontDisplay ?? template.fontDisplay);
  const body = pilhaFonte(aparencia?.fontBody ?? template.fontBody);
  const escuro = palette.bg.toUpperCase() !== "#FFFFFF";
  const handle = arrobaVisivel(arroba);

  /**
   * Qual URL falhou (nunca `true`/`false`): trocar a foto muda a URL e o card
   * volta a tentar automaticamente. `file://`, base64 corrompido e arquivo
   * apagado do disco do projeto caem todos aqui.
   */
  const [srcQuebrado, setSrcQuebrado] = useState<string | null>(null);
  const temImagem = Boolean(slide.imagem) && slide.imagem !== srcQuebrado;

  const fundo = (veu: string) =>
    temImagem ? (
      <>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={slide.imagem ?? ""}
          alt=""
          aria-hidden
          onError={() => setSrcQuebrado(slide.imagem ?? null)}
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
          }}
        />
        <div style={{ position: "absolute", inset: 0, background: veu }} />
      </>
    ) : (
      // Sem imagem: nada por cima da cor de fundo do card. Sólido, por decisão
      // do produto (ver comentário acima).
      null
    );

  const base = {
    width: LARGURA_CARD,
    height: ALTURA_CARD,
    position: "relative" as const,
    overflow: "hidden" as const,
    backgroundColor: palette.bg,
    color: palette.text,
  };

  /**
   * Marca de teste/inspeção na arte. `data-card-arte` existe para o gate medir o
   * card pelo TIPO (arte 1080×1440) sem confundir com o nó de export, que é a
   * janela 4:5.
   */
  const marcas = { "data-card-arte": indice, "data-tipo-card": slide.tipo };

  /**
   * Rodapé dos cards de conteúdo e de CTA. `meio` é o @: fica entre a chamada de
   * arrasto e o contador, alinhado ao centro pela distribuição — não empurra
   * nada e não colide com o contador quando o handle é longo.
   */
  const rodape = (texto: string, cor: string, opacidade = 1, mostrarArroba = true) => (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        fontFamily: body,
        fontSize: 26,
        letterSpacing: 2,
        textTransform: "uppercase",
        color: cor,
        opacity: opacidade,
        gap: 16,
      }}
    >
      <span style={{ whiteSpace: "nowrap" }}>{texto}</span>
      {mostrarArroba && handle ? (
        <span
          data-arroba-card
          style={{
            textTransform: "none",
            letterSpacing: 0,
            fontWeight: 600,
            maxWidth: 460,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {handle}
        </span>
      ) : null}
      <span style={{ whiteSpace: "nowrap" }}>
        {indice + 1}/{total}
      </span>
    </div>
  );

  // ---------- CAPA ----------
  if (slide.tipo === "capa") {
    const tamanho = corpoDaManchete(slide.titulo || "", template.tituloGrande);
    /**
     * `base` é um número, não um objeto: a regra continua sendo a constante do
     * módulo (referência estável) e o tamanho de partida entra como prop. Passar
     * `{ ...ENCAIXE, base }` criaria objeto novo a cada render e o medidor do
     * bloco rodaria de novo sem nada ter mudado — com 30 miniaturas de template
     * montadas, isso é medição de graça em laço.
     */

    return (
      <div style={base} id={`card-${indice}`} {...marcas}>
        {fundo(VEU_CAPA)}

        <div
          style={{
            position: "absolute",
            left: 80,
            right: 80,
            top: BLEED_Y + 80,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            fontFamily: body,
            fontSize: 24,
            letterSpacing: 3,
            textTransform: "uppercase",
            color: temImagem ? "rgba(255,255,255,.9)" : palette.muted,
          }}
        >
          {/* O @ ocupa o canto que antes era vazio: marca no topo, contador na ponta. */}
          <span
            style={{
              textTransform: "none",
              letterSpacing: 0,
              fontWeight: 600,
              maxWidth: 560,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
            {...{ "data-arroba-card": handle || undefined }}
          >
            {handle}
          </span>
          <span>
            {indice + 1}/{total}
          </span>
        </div>
        <div
          style={{
            position: "absolute",
            left: 80,
            right: 80,
            bottom: BLEED_Y + 80,
            display: "flex",
            flexDirection: "column",
            gap: 24,
          }}
        >
          <BlocoTexto
            bloco="manchete"
            texto={slide.titulo || "Escreva a manchete aqui"}
            textoPuro={limparMarcacao(slide.titulo || "Escreva a manchete aqui")}
            regra={ENCAIXE.capa.manchete}
            base={tamanho}
            renderizar={(t) => comDestaque(t, palette.accent)}
            estilo={{
              fontFamily: display,
              fontWeight: 800,
              letterSpacing: -1,
              textTransform: "uppercase",
              color: temImagem ? "#FFFFFF" : palette.text,
            }}
          />

          {slide.corpo ? (
            <BlocoTexto
              bloco="corpo"
              texto={slide.corpo}
              textoPuro={limparMarcacao(slide.corpo)}
              regra={ENCAIXE.capa.corpo}
              renderizar={(t) => t}
              estilo={{
                fontFamily: body,
                color: temImagem ? "#FFFFFF" : palette.muted,
                opacity: temImagem ? 0.92 : 1,
                maxWidth: 820,
              }}
            />
          ) : null}

          <div
            style={{
              height: 56,
              border: `2px solid ${temImagem ? "rgba(255,255,255,.6)" : palette.accent}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "0 22px",
              fontFamily: body,
              fontSize: 28,
              fontWeight: 700,
              letterSpacing: 3,
              textTransform: "uppercase",
              color: temImagem ? "#FFFFFF" : palette.text,
            }}
          >
            <span>Arrasta pro lado</span>
            <span aria-hidden>→</span>
          </div>
        </div>

        {guia ? <GuiaAreaSegura /> : null}
      </div>
    );
  }

  // ---------- CTA ----------
  if (slide.tipo === "cta") {
    /**
     * Foto de fundo manda na cor do texto: sobre o véu, branco é o que lê.
     *
     * Sem foto, o fundo é o DESTAQUE — e aí a cor do texto vem do contraste dele
     * (`corLegivelSobre`), não de "escuro = branco". Com paleta curada, destaque
     * claro (verde-água, lima) existe, e branco sobre lima dá 1,5:1: o último
     * card do carrossel sairia ilegível.
     */
    const bgCta = temImagem ? palette.accent : escuro ? palette.accent : palette.bg;
    const textoCta = corLegivelSobre(bgCta);
    const secundarioCta = textoCta === "#FFFFFF" ? "rgba(255,255,255,.8)" : palette.muted;
    const enfaseCta = textoCta === "#FFFFFF" ? "#FFFFFF" : palette.accent;

    return (
      <div style={{ ...base, backgroundColor: bgCta }} id={`card-${indice}`} {...marcas}>
        {fundo(VEU_TEXTO)}
        <div
          style={{
            position: "absolute",
            left: 64,
            right: 64,
            top: BLEED_Y + 180,
            fontFamily: body,
            fontSize: 28,
            letterSpacing: 4,
            textTransform: "uppercase",
            color: secundarioCta,
          }}
        >
          Último card
        </div>
        <BlocoTexto
          bloco="manchete"
          texto={slide.titulo || "Salve este post"}
          textoPuro={limparMarcacao(slide.titulo || "Salve este post")}
          regra={ENCAIXE.cta.manchete}
          renderizar={(t) => comDestaque(t, enfaseCta)}
          estilo={{
            position: "absolute",
            left: 64,
            right: 64,
            top: BLEED_Y + 240,
            fontFamily: display,
            fontWeight: 800,
            textTransform: "uppercase",
            color: textoCta,
          }}
        />
        {slide.corpo ? (
          <BlocoTexto
            bloco="corpo"
            texto={slide.corpo}
            textoPuro={limparMarcacao(slide.corpo)}
            regra={ENCAIXE.cta.corpo}
            renderizar={(t) => t}
            estilo={{
              position: "absolute",
              left: 64,
              right: 64,
              top: BLEED_Y + 640,
              fontFamily: body,
              color: textoCta,
              opacity: temImagem ? 0.94 : 1,
            }}
          />
        ) : null}
        <div style={{ position: "absolute", left: 64, right: 64, bottom: BLEED_Y + 52 }}>
          {rodape(handle ? "Salve este post" : "Feito com IA", textoCta, 0.85)}
        </div>

        {guia ? <GuiaAreaSegura /> : null}
      </div>
    );
  }

  // ---------- CONTEÚDO ----------
  return (
    <div style={base} id={`card-${indice}`} {...marcas}>
      {fundo(VEU_TEXTO)}

      <div
        style={{
          position: "absolute",
          left: 64,
          right: 64,
          top: BLEED_Y + 96,
          bottom: BLEED_Y + 132,
          display: "flex",
          flexDirection: "column",
          gap: 32,
        }}
      >
        <div
          style={{
            width: 96,
            height: 10,
            backgroundColor: temImagem ? "rgba(255,255,255,.85)" : palette.accent,
            flexShrink: 0,
          }}
        />

        <BlocoTexto
          bloco="manchete"
          texto={slide.titulo || "Título do card"}
          textoPuro={limparMarcacao(slide.titulo || "Título do card")}
          regra={{ ...ENCAIXE.conteudo.manchete, tetoPx: temImagem ? 380 : 320 }}
          renderizar={(t) => comDestaque(t, palette.accent)}
          estilo={{
            fontFamily: display,
            fontWeight: 800,
            letterSpacing: -0.5,
            color: temImagem ? "#FFFFFF" : palette.text,
            flexShrink: 0,
          }}
        />

        <BlocoTexto
          bloco="corpo"
          texto={slide.corpo || ""}
          textoPuro={limparMarcacao(slide.corpo || "")}
          regra={ENCAIXE.conteudo.corpo}
          renderizar={(t) => t}
          estilo={{
            fontFamily: body,
            color: temImagem ? "#FFFFFF" : palette.text,
            opacity: temImagem ? 0.94 : 0.95,
            flexShrink: 0,
          }}
        />
      </div>

      <div style={{ position: "absolute", left: 64, right: 64, bottom: BLEED_Y + 48 }}>
        {rodape(
          "Arrasta pro lado",
          temImagem ? "#FFFFFF" : palette.muted,
          temImagem ? 0.88 : 0.9,
        )}
      </div>

      {guia ? <GuiaAreaSegura /> : null}
    </div>
  );
}

/** Card em escala para a tela: layout interno sempre 1080×1440. */
export function Cartao({
  slide,
  template,
  indice,
  total,
  largura,
  aparencia,
  arroba,
  guia,
}: Props & { largura: number }) {
  const escala = largura / LARGURA_CARD;
  return (
    <div
      data-cartao
      style={{
        width: largura,
        height: Math.round(ALTURA_CARD * escala),
        position: "relative",
        overflow: "hidden",
        borderRadius: 10,
      }}
    >
      <div style={{ transform: `scale(${escala})`, transformOrigin: "top left" }}>
        <CartaoCard
          slide={slide}
          template={template}
          indice={indice}
          total={total}
          aparencia={aparencia}
          arroba={arroba}
          guia={guia}
        />
      </div>
      {/* Legenda da guia em CSS, fora da arte: dentro do card, 24 px de arte
          viram 6 px na tela. Aqui ela tem tamanho de interface e continua
          discreta — canto, 10 px, pastilha branca. */}
      {guia ? (
        <span
          aria-hidden
          data-legenda-area-segura
          style={{
            position: "absolute",
            top: 4,
            right: 4,
            fontFamily: "var(--font-inter), system-ui, sans-serif",
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: 0.4,
            textTransform: "uppercase",
            lineHeight: 1.2,
            color: "#0E7490",
            backgroundColor: "rgba(255,255,255,.94)",
            border: "1px solid rgba(244,81,30,.45)",
            borderRadius: 6,
            padding: "2px 5px",
            pointerEvents: "none",
          }}
        >
          área segura 4:5
        </span>
      ) : null}
    </div>
  );
}
