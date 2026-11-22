"use client";

/**
 * Um card do carrossel, desenhado no tamanho final (1080x1350).
 *
 * Por que tamanho fixo e não CSS responsivo: o PNG precisa sair em 1080x1350
 * com a mesma quebra de linha que a pessoa viu. Se a prévia fosse fluida, o
 * export (que rasteriza o nó em tamanho real) sairia diferente da tela. Então o
 * card é sempre 1080x1350 e a prévia escala com `transform`.
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
 */
import { useState } from "react";

import type { SlideCarrossel } from "@/lib/estudio/tipos";
import { pilhaFonte, type PaletteTemplate, type TemplateCarrossel } from "@/lib/templates";

export const LARGURA_CARD = 1080;
export const ALTURA_CARD = 1350;

/** Véu da capa: forte embaixo (onde o texto senta), limpo em cima (onde a foto aparece). */
const VEU_CAPA =
  "linear-gradient(to top, rgba(0,0,0,.92) 0%, rgba(0,0,0,.55) 38%, rgba(0,0,0,0) 70%)";

/** Véu do card de conteúdo: o texto ocupa o card inteiro, então o véu também. */
const VEU_TEXTO =
  "linear-gradient(to top, rgba(0,0,0,.9) 0%, rgba(0,0,0,.66) 46%, rgba(0,0,0,.34) 100%)";

/** Fundo sem foto: dois halos da paleta. Retângulo preto vazio é o que não queremos. */
function gradienteDaPaleta(palette: PaletteTemplate) {
  return `radial-gradient(120% 90% at 78% 12%, ${palette.accent}55 0%, transparent 62%), radial-gradient(90% 70% at 10% 95%, ${palette.muted}22 0%, transparent 60%)`;
}

interface Props {
  slide: SlideCarrossel;
  template: TemplateCarrossel;
  indice: number;
  total: number;
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

export function CartaoCard({ slide, template, indice, total }: Props) {
  const { palette } = template;
  const display = pilhaFonte(template.fontDisplay);
  const body = pilhaFonte(template.fontBody);
  const escuro = template.palette.bg.toUpperCase() !== "#FFFFFF";

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
      <div style={{ position: "absolute", inset: 0, background: gradienteDaPaleta(palette) }} />
    );

  const base = {
    width: LARGURA_CARD,
    height: ALTURA_CARD,
    position: "relative" as const,
    overflow: "hidden" as const,
    backgroundColor: palette.bg,
    color: palette.text,
  };

  const rodape = (texto: string, cor: string, opacidade = 1) => (
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
      }}
    >
      <span>{texto}</span>
      <span>
        {indice + 1}/{total}
      </span>
    </div>
  );

  // ---------- CAPA ----------
  if (slide.tipo === "capa") {
    const tamanho = corpoDaManchete(slide.titulo || "", template.tituloGrande);

    return (
      <div style={base} id={`card-${indice}`}>
        {fundo(VEU_CAPA)}

        <div
          style={{
            position: "absolute",
            left: 80,
            right: 80,
            top: 80,
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
          <span />
          <span>
            {indice + 1}/{total}
          </span>
        </div>
        <div
          style={{
            position: "absolute",
            left: 80,
            right: 80,
            bottom: 80,
            display: "flex",
            flexDirection: "column",
            gap: 24,
          }}
        >
          <div
            style={{
              fontFamily: display,
              fontWeight: 800,
              fontSize: tamanho,
              lineHeight: 1,
              letterSpacing: -1,
              textTransform: "uppercase",
              color: temImagem ? "#FFFFFF" : palette.text,
              maxHeight: 640,
              overflow: "hidden",
            }}
          >
            {comDestaque(slide.titulo || "Escreva a manchete aqui", palette.accent)}
          </div>

          {slide.corpo ? (
            <div
              style={{
                fontFamily: body,
                fontSize: 34,
                lineHeight: 1.32,
                color: temImagem ? "#FFFFFF" : palette.muted,
                opacity: temImagem ? 0.92 : 1,
                maxHeight: 140,
                maxWidth: 820,
                overflow: "hidden",
              }}
            >
              {limparMarcacao(slide.corpo)}
            </div>
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
      </div>
    );
  }

  // ---------- CTA ----------
  if (slide.tipo === "cta") {
    // Foto de fundo manda na cor do texto: sobre o véu, branco é o que lê.
    const claro = temImagem || escuro;
    return (
      <div
        style={{ ...base, backgroundColor: temImagem ? palette.accent : escuro ? palette.accent : palette.bg }}
        id={`card-${indice}`}
      >
        {fundo(VEU_TEXTO)}
        <div
          style={{
            position: "absolute",
            left: 64,
            right: 64,
            top: 180,
            fontFamily: body,
            fontSize: 28,
            letterSpacing: 4,
            textTransform: "uppercase",
            color: claro ? "rgba(255,255,255,.8)" : palette.muted,
          }}
        >
          Último card
        </div>
        <div
          style={{
            position: "absolute",
            left: 64,
            right: 64,
            top: 240,
            fontFamily: display,
            fontWeight: 800,
            fontSize: 92,
            lineHeight: 1.02,
            textTransform: "uppercase",
            color: claro ? "#FFFFFF" : palette.text,
            maxHeight: 420,
            overflow: "hidden",
          }}
        >
          {comDestaque(slide.titulo || "Salve este post", claro ? "#FFFFFF" : palette.accent)}
        </div>
        {slide.corpo ? (
          <div
            style={{
              position: "absolute",
              left: 64,
              right: 64,
              top: 640,
              maxHeight: 400,
              overflow: "hidden",
              fontFamily: body,
              fontSize: 40,
              lineHeight: 1.35,
              color: claro ? "#FFFFFF" : palette.text,
              opacity: temImagem ? 0.94 : 1,
            }}
          >
            {limparMarcacao(slide.corpo)}
          </div>
        ) : null}
        <div style={{ position: "absolute", left: 64, right: 64, bottom: 52 }}>
          {rodape("Feito com IA", claro ? "#FFFFFF" : palette.muted, claro ? 0.85 : 1)}
        </div>
      </div>
    );
  }

  // ---------- CONTEÚDO ----------
  return (
    <div style={base} id={`card-${indice}`}>
      {fundo(VEU_TEXTO)}

      <div
        style={{
          position: "absolute",
          left: 64,
          right: 64,
          top: 96,
          bottom: 132,
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

        <div
          style={{
            fontFamily: display,
            fontWeight: 800,
            fontSize: 72,
            lineHeight: 1.06,
            letterSpacing: -0.5,
            color: temImagem ? "#FFFFFF" : palette.text,
            maxHeight: temImagem ? 380 : 320,
            overflow: "hidden",
            flexShrink: 0,
          }}
        >
          {comDestaque(slide.titulo || "Título do card", palette.accent)}
        </div>

        <div
          style={{
            fontFamily: body,
            fontSize: 38,
            lineHeight: 1.42,
            color: temImagem ? "#FFFFFF" : palette.text,
            opacity: temImagem ? 0.94 : 0.95,
            overflow: "hidden",
            flexShrink: 1,
            minHeight: 0,
          }}
        >
          {limparMarcacao(slide.corpo)}
        </div>
      </div>

      <div style={{ position: "absolute", left: 64, right: 64, bottom: 48 }}>
        {rodape("Arrasta pro lado", temImagem ? "#FFFFFF" : palette.muted, temImagem ? 0.88 : 0.9)}
      </div>
    </div>
  );
}

/** Card em escala para a tela: layout interno sempre 1080x1350. */
export function Cartao({
  slide,
  template,
  indice,
  total,
  largura,
}: Props & { largura: number }) {
  const escala = largura / LARGURA_CARD;
  return (
    <div
      style={{
        width: largura,
        height: Math.round(ALTURA_CARD * escala),
        position: "relative",
        overflow: "hidden",
        borderRadius: 10,
      }}
    >
      <div style={{ transform: `scale(${escala})`, transformOrigin: "top left" }}>
        <CartaoCard slide={slide} template={template} indice={indice} total={total} />
      </div>
    </div>
  );
}
