#!/usr/bin/env python3
"""Gera os mockups das três direções (editor + galeria) em HTML autocontido.

Cada arquivo é uma página completa, com fontes woff2 locais (./fonts), sem CDN.
Direções, um eixo cada:
  A — neutro denso   (Linear): Inter, indigo #5E6AD2, rail escuro, 14px, linhas de 44px
  B — claro e arejado (Notion/Stripe): Public Sans, azul #2383E2, canvas #FAFAF8, 15px
  C — acento confiante (Vercel/Geist): Geist, teal #0D9373, bloco preenchido no topo
"""

import os

OUT = os.path.dirname(os.path.abspath(__file__))

DIRECOES = {
    "a-neutro-denso": dict(
        nome="Neutro denso",
        sans="Inter",
        bg="#FFFFFF", canvas="#F7F8F9", card="#FFFFFF",
        texto="#111318", texto_2="#4E5464", texto_3="#767C8C",
        borda="#E6E8EC", borda_forte="#D6D9E0",
        acento="#5E6AD2", acento_texto="#FFFFFF", acento_soft="#EEF0FB",
        base=14, titulo_pagina=22, h_card=14.5, meta=12, linha=44, pad_card=13, raio=8,
        gap_card=12, sombra="0 1px 2px rgba(16,18,24,.06)",
        colunas=3, thumb="horizontal", thumb_w=78,
    ),
    "b-claro-arejado": dict(
        nome="Claro e arejado",
        sans="Public Sans",
        bg="#FAFAF8", canvas="#F2F2EE", card="#FFFFFF",
        texto="#1A1C1F", texto_2="#55595F", texto_3="#82868D",
        borda="#E8E7E1", borda_forte="#DCDBD4",
        acento="#2383E2", acento_texto="#FFFFFF", acento_soft="#EAF2FC",
        base=15, titulo_pagina=30, h_card=16, meta=13, linha=52, pad_card=16, raio=10,
        gap_card=14, sombra="0 1px 2px rgba(26,28,31,.05)",
        colunas=2, thumb="grande", thumb_w=92,
    ),
    "c-acento-confiante": dict(
        nome="Acento confiante",
        sans="Geist",
        bg="#FFFFFF", canvas="#F6F6F5", card="#FFFFFF",
        texto="#0B0B0C", texto_2="#55554F", texto_3="#83837D",
        borda="#E7E7E4", borda_forte="#D8D8D4",
        acento="#0D9373", acento_texto="#FFFFFF", acento_soft="#E6F4F0",
        base=14, titulo_pagina=25, h_card=15, meta=12, linha=44, pad_card=15, raio=12,
        gap_card=14, sombra="0 1px 2px rgba(11,11,12,.06)",
        colunas=3, thumb="horizontal", thumb_w=78,
    ),
}

FONTES = {
    "Inter": "@font-face{font-family:'Inter';src:url('fonts/Inter-variable.woff2') format('woff2');font-weight:100 900;font-style:normal;font-display:swap}",
    "Public Sans": "@font-face{font-family:'Public Sans';src:url('fonts/PublicSans-variable.woff2') format('woff2');font-weight:100 900;font-style:normal;font-display:swap}",
    "Geist": """
@font-face{font-family:'Geist';src:url('fonts/Geist-Regular.woff2') format('woff2');font-weight:400;font-display:swap}
@font-face{font-family:'Geist';src:url('fonts/Geist-Medium.woff2') format('woff2');font-weight:500;font-display:swap}
@font-face{font-family:'Geist';src:url('fonts/Geist-SemiBold.woff2') format('woff2');font-weight:600;font-display:swap}
@font-face{font-family:'Geist';src:url('fonts/Geist-Bold.woff2') format('woff2');font-weight:700;font-display:swap}""",
}

ICONES = {
    "busca": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><circle cx="11" cy="11" r="6.6"/><path d="M19.6 19.6l-3.4-3.4"/></svg>',
    "mais": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><path d="M12 5.5v13M5.5 12h13"/></svg>',
    "seta-esq": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 6.5L9 12l5.5 5.5"/></svg>',
    "seta-dir": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M9.5 6.5L15 12l-5.5 5.5"/></svg>',
    "download": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4.5v10.5"/><path d="M8 11.5l4 4 4-4"/><path d="M5.5 19h13"/></svg>',
    "duplicar": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="9.5" y="9.5" width="10.5" height="10.5" rx="2.5"/><path d="M14.5 6A2.5 2.5 0 0012 3.5H6.5A2.5 2.5 0 004 6v5.5A2.5 2.5 0 006.5 14"/></svg>',
    "historico": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M4.2 12a7.8 7.8 0 107.8-7.8 7.8 7.8 0 00-6.6 3.8"/><path d="M4.2 4.6v4.2h4.2"/><path d="M12 8.4v3.9l2.8 1.7"/></svg>',
    "marca": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="4" width="16" height="16" rx="4.5"/><path d="M9.4 15.2V8.8l5.2 6.4V8.8"/></svg>',
    "pauta": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M6.2 4.2h8.4l3.2 3.2v12.4H6.2z"/><path d="M9 11.2h6M9 14.8h4"/></svg>',
}

# t1 = texto da capa (curto), t2 = subtítulo da capa, cor = fundo
PROJETOS = [
    dict(titulo="Fiscalização na estética: 7 pontos que a Vigilância olha",
         capa=("Fiscalização na estética", "7 pontos que a Vigilância olha antes de autuar", "#123B32"),
         versao=4, slides=7, quando="há 2 h", autor="Ana Prado", status="publicado"),
    dict(titulo="Harmonização facial: o que muda com a nova regra da Anvisa",
         capa=("Nova regra da Anvisa", "O que muda para quem aplica harmonização", "#242743"),
         versao=2, slides=6, quando="há 1 dia", autor="Ana Prado", status="rascunho"),
    dict(titulo="Precificação de protocolo: como parar de perder margem",
         capa=("Precificação de protocolo", "O custo que ninguém coloca na conta", "#3A2A1B"),
         versao=1, slides=5, quando="há 3 dias", autor="Clécio Menezes", status="sem link"),
    dict(titulo="Como responder avaliação negativa no Google sem parecer robô",
         capa=("Avaliação negativa", "Como responder sem parecer robô", "#1B2532"),
         versao=3, slides=5, quando="há 5 dias", autor="Ana Prado", status="publicado"),
    dict(titulo="Retenção de paciente: o protocolo que faz voltar em 30 dias",
         capa=("Retenção de paciente", "O que faz voltar em 30 dias", "#2A1B2C"),
         versao=2, slides=6, quando="há 6 dias", autor="Ana Prado", status="sem link"),
    dict(titulo="Sala de procedimento: o checklist da RDC 63",
         capa=("Sala de procedimento", "O checklist da RDC 63", "#14262F"),
         versao=1, slides=5, quando="há 8 dias", autor="Clécio Menezes", status="publicado"),
]

STATUS_ROTULO = {"publicado": "Link ativo", "rascunho": "Rascunho", "sem link": "Sem link"}


def css(d):
    denso = d["base"] < 15
    return f"""
{FONTES[d['sans']]}
*{{box-sizing:border-box;margin:0;padding:0}}
html,body{{height:100%}}
body{{
  font-family:'{d['sans']}',system-ui,-apple-system,sans-serif;
  font-size:{d['base']}px;line-height:{1.45 if denso else 1.5};
  color:{d['texto']};background:{d['bg']};-webkit-font-smoothing:antialiased;
}}
::selection{{background:{d['acento']};color:{d['acento_texto']}}}
:focus-visible{{outline:2px solid {d['acento']};outline-offset:2px;border-radius:4px}}
::-webkit-scrollbar{{width:10px;height:10px}}
::-webkit-scrollbar-thumb{{background:{d['borda_forte']};border-radius:99px;border:3px solid {d['bg']}}}
::-webkit-scrollbar-track{{background:transparent}}
button{{font:inherit;color:inherit;background:none;border:0;cursor:pointer}}
svg{{width:17px;height:17px;display:block;flex:none}}
.num{{font-variant-numeric:tabular-nums}}
.ico svg{{width:15px;height:15px}}

.top{{height:{52 if not denso else 48}px;display:flex;align-items:center;gap:12px;
  padding:0 {26 if not denso else 18}px;background:{d['bg']};border-bottom:1px solid {d['borda']};position:relative;z-index:3}}
.marca{{display:flex;align-items:center;gap:8px;font-weight:600;letter-spacing:-.01em;font-size:{d['base']}px}}
.marca .selo{{width:22px;height:22px;border-radius:6px;background:{d['acento']};display:grid;place-items:center;color:{d['acento_texto']}}}
.marca .selo svg{{width:13px;height:13px}}
.crumb{{color:{d['texto_3']};font-size:{d['meta']}px;display:flex;align-items:center;gap:7px;min-width:0}}
.crumb b{{color:{d['texto_2']};font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}}
.espaco{{flex:1}}
.btn{{display:inline-flex;align-items:center;justify-content:center;gap:6px;height:32px;padding:0 11px;
  border-radius:{d['raio']-2}px;font-size:{d['base']-1}px;font-weight:500;border:1px solid transparent;white-space:nowrap}}
.btn-ghost{{color:{d['texto_2']}}}
.btn-ghost:hover{{background:{d['canvas']};color:{d['texto']}}}
.btn-linha{{border-color:{d['borda_forte']};background:{d['card']};color:{d['texto']}}}
.btn-linha:hover{{background:{d['canvas']}}}
.btn-primario{{background:{d['acento']};color:{d['acento_texto']};font-weight:600}}
.btn-primario:hover{{filter:brightness(.94)}}
.pager{{display:flex;align-items:center;gap:1px;border:1px solid {d['borda']};border-radius:{d['raio']}px;padding:2px;background:{d['card']};height:32px}}
.pager button{{width:26px;height:26px;display:grid;place-items:center;border-radius:{d['raio']-3}px;color:{d['texto_2']}}}
.pager button:hover{{background:{d['canvas']}}}
.pager .cont{{padding:0 8px;font-size:{d['meta']}px;color:{d['texto_2']};border-left:1px solid {d['borda']};margin-left:1px;line-height:26px;font-weight:500}}

.app{{height:calc(100% - {52 if not denso else 48}px);overflow:hidden}}
.corpo{{display:grid;grid-template-columns:{280 if denso else 296}px minmax(0,1fr) {292 if denso else 312}px;height:100%;min-height:0;background:{d['canvas']}}}
.painel{{background:{d['card']};border-right:1px solid {d['borda']};overflow:auto}}
.painel.dir{{border-right:0;border-left:1px solid {d['borda']}}}
.secao{{padding:{16 if not denso else 14}px}}
.secao + .secao{{border-top:1px solid {d['borda']}}}
.secao h2{{font-size:11px;font-weight:600;color:{d['texto_3']};letter-spacing:.04em;text-transform:uppercase;margin-bottom:11px;
  display:flex;align-items:center;justify-content:space-between}}
.campo{{margin-bottom:11px}}
.campo label{{display:block;font-size:{d['meta']}px;color:{d['texto_2']};margin-bottom:5px;font-weight:500}}
.campo input{{width:100%;height:32px;padding:0 9px;border-radius:{d['raio']-2}px;border:1px solid {d['borda_forte']};
  background:{d['bg']};color:{d['texto']};font:inherit;font-size:{d['base']-0.5}px}}
.campo input:focus{{outline:2px solid {d['acento']};outline-offset:-1px}}
.marca-card{{display:flex;align-items:center;gap:9px;padding:9px;border-radius:{d['raio']}px;background:{d['canvas']};border:1px solid {d['borda']}}}
.avatar{{width:30px;height:30px;border-radius:999px;background:{d['acento']};color:{d['acento_texto']};
  display:grid;place-items:center;font-size:11px;font-weight:700;flex:none;letter-spacing:.02em}}
.marca-card .nm{{font-weight:600;font-size:{d['base']-0.5}px;line-height:1.3}}
.marca-card .hd{{color:{d['texto_3']};font-size:{d['meta']}px;line-height:1.3}}
.ajuda{{font-size:{d['meta']-1}px;color:{d['texto_3']};margin-top:7px;line-height:1.4}}
.trilho{{position:relative;height:6px;border-radius:99px;background:{d['borda']};margin:9px 0 3px}}
.trilho span{{position:absolute;left:0;top:0;bottom:0;border-radius:99px;background:{d['acento']}}}
.trilho i{{position:absolute;top:50%;width:14px;height:14px;border-radius:99px;background:{d['bg']};
  border:2px solid {d['acento']};transform:translate(-50%,-50%)}}
.swatches{{display:flex;gap:7px}}
.sw{{width:23px;height:23px;border-radius:7px;border:1px solid rgba(0,0,0,.16);background-clip:padding-box}}
.sw.on{{box-shadow:0 0 0 2px {d['card']},0 0 0 3.5px {d['acento']}}}
.seg{{display:flex;gap:2px;padding:2px;border-radius:{d['raio']-1}px;background:{d['canvas']};border:1px solid {d['borda']}}}
.seg button{{flex:1;height:26px;border-radius:{d['raio']-3}px;font-size:{d['meta']}px;color:{d['texto_2']}}}
.seg button.on{{background:{d['acento_soft']};color:{d['acento']};font-weight:600}}
.linha-lista{{display:flex;align-items:center;justify-content:space-between;height:{d['linha']}px;
  padding:0 2px;border-bottom:1px solid {d['borda']};font-size:{d['base']-1}px;color:{d['texto_2']}}}
.linha-lista:last-of-type{{border-bottom:0}}
.linha-lista b{{font-weight:600;color:{d['texto']}}}

.palco{{display:flex;flex-direction:column;min-width:0;min-height:0;background:{d['canvas']}}}
.palco-topo{{height:40px;display:flex;align-items:center;gap:8px;padding:0 20px;border-bottom:1px solid {d['borda']};background:{d['bg']}}}
.palco-topo .tag{{font-size:{d['meta']}px;color:{d['texto_3']}}}
.salvo{{display:inline-flex;align-items:center;gap:6px;font-size:{d['meta']}px;color:{d['texto_2']};font-weight:500}}
.ponto{{width:6px;height:6px;border-radius:99px;background:{d['acento']}}}
.slide-area{{flex:1;display:grid;place-items:center;padding:22px;min-height:0}}
.slide{{width:348px;aspect-ratio:4/5;border-radius:{d['raio']}px;overflow:hidden;position:relative;
  background:#123B32;color:#fff;box-shadow:0 10px 30px rgba(12,16,24,.18);display:flex;flex-direction:column;
  padding:30px}}
.slide .txt{{margin-top:auto}}
.slide h3{{font-size:27px;line-height:1.16;font-weight:600;letter-spacing:-.02em;text-wrap:balance}}
.slide p{{font-size:13px;line-height:1.45;color:rgba(255,255,255,.84);margin-top:14px;max-width:24ch;text-wrap:pretty}}
.slide .rodape{{margin-top:auto;display:flex;align-items:center;justify-content:space-between;font-size:11px;color:rgba(255,255,255,.88)}}
.slide .rodape .m{{display:flex;align-items:center;gap:7px}}
.slide .rodape .av{{width:19px;height:19px;border-radius:99px;background:rgba(255,255,255,.18);display:grid;place-items:center;font-size:8px;font-weight:700}}
.slide .sel{{position:absolute;inset:0;border:2px solid {d['acento']};border-radius:{d['raio']}px;pointer-events:none}}

.fita{{height:{92 if denso else 98}px;border-top:1px solid {d['borda']};background:{d['bg']};
  display:flex;align-items:center;gap:9px;padding:0 18px;overflow:hidden}}
.fita .mini{{width:41px;height:51px;border-radius:5px;flex:none;position:relative;overflow:hidden;border:1px solid rgba(0,0,0,.08)}}
.fita .mini .n{{position:absolute;right:3px;bottom:2px;font-size:6.5px;color:rgba(255,255,255,.75);font-weight:600}}
.fita .mini .mt{{position:absolute;left:4px;top:4px;right:4px;font-size:5.5px;line-height:1.25;font-weight:600;
  color:rgba(255,255,255,.94);display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}}
.fita .mini.on{{outline:2px solid {d['acento']};outline-offset:1px}}
.fita .mais{{width:41px;height:51px;border-radius:5px;border:1px dashed {d['borda_forte']};display:grid;place-items:center;color:{d['texto_3']};flex:none}}
.fita .mais svg{{width:13px;height:13px}}
.fita .rotulo{{margin-left:6px;font-size:{d['meta']}px;color:{d['texto_3']};white-space:nowrap}}

.pauta .cnt{{font-weight:500;color:{d['texto_3']};text-transform:none;letter-spacing:0}}
.item-pauta{{border:1px solid {d['borda']};border-radius:{d['raio']}px;padding:10px;margin-bottom:8px;background:{d['bg']};
  display:flex;flex-direction:column;min-height:112px}}
.item-pauta .fonte{{display:flex;align-items:center;justify-content:space-between;gap:8px;font-size:11px;color:{d['texto_3']}}}
.item-pauta .fonte b{{color:{d['texto_2']};font-weight:600}}
.item-pauta .fonte .nota{{color:{d['texto']};font-weight:600;font-size:{d['meta']}px}}
.item-pauta .tt{{font-size:{d['base']-0.5}px;font-weight:600;line-height:1.35;margin-top:7px;
  display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;min-height:{1.35*(d['base']-0.5)*2}px}}
.item-pauta .bt{{margin-top:auto;padding-top:9px;display:flex;gap:6px;align-items:center}}
.item-pauta .bt .btn{{height:26px;padding:0 8px;font-size:11px}}
.rodape-link{{display:flex;justify-content:center;margin-top:9px}}
.rodape-link .btn{{font-size:{d['meta']}px}}

/* ---------- galeria ---------- */
.gal{{background:{d['bg']};min-height:100%;display:flex;flex-direction:column}}
.gal-cab{{padding:{24 if not denso else 18}px {30 if not denso else 22}px 0}}
.gal-tit{{display:flex;align-items:flex-end;justify-content:space-between;gap:16px;flex-wrap:wrap}}
.gal-tit h1{{font-size:{d['titulo_pagina']}px;font-weight:600;letter-spacing:-.025em;line-height:1.1}}
.gal-tit .sub{{color:{d['texto_2']};font-size:{d['base']}px;margin-top:7px}}
.gal-tit .acoes{{display:flex;gap:8px;align-items:center;flex-wrap:wrap}}
.busca{{display:flex;align-items:center;gap:7px;height:32px;padding:0 10px;border:1px solid {d['borda_forte']};
  border-radius:{d['raio']-2}px;background:{d['card']};color:{d['texto_3']};min-width:210px}}
.busca span{{font-size:{d['base']-1}px}}
.filtros{{display:flex;gap:6px;margin:{16 if not denso else 13}px 0;flex-wrap:wrap}}
.chip{{height:27px;padding:0 10px;border-radius:999px;border:1px solid {d['borda_forte']};
  font-size:{d['meta']}px;color:{d['texto_2']};display:inline-flex;align-items:center;gap:6px;background:{d['bg']}}}
.chip.on{{background:{d['texto']};color:{d['bg']};border-color:{d['texto']};font-weight:500}}
.grid{{display:grid;grid-template-columns:repeat({d['colunas']},minmax(0,1fr));gap:{d['gap_card']}px;
  padding:0 {30 if not denso else 22}px {22 if not denso else 18}px}}
.pcard{{background:{d['card']};border:1px solid {d['borda']};border-radius:{d['raio']+2}px;box-shadow:{d['sombra']};
  display:flex;flex-direction:column;overflow:hidden}}
.pcard:hover{{border-color:{d['borda_forte']}}}
.pc-topo{{display:flex;gap:{12 if denso else 16}px;padding:{d['pad_card']}px}}
.thumb{{width:{d["thumb_w"]}px;aspect-ratio:4/5;border-radius:6px;overflow:hidden;position:relative;flex:none;
  display:flex;flex-direction:column;justify-content:space-between;padding:8px;color:#fff}}
.thumb .tt{{font-size:{7.5 if denso else 9}px;font-weight:600;line-height:1.25;letter-spacing:-.01em}}
.thumb .hd{{font-size:6.5px;color:rgba(255,255,255,.7);display:flex;justify-content:space-between;align-items:center}}
.thumb .av{{width:9px;height:9px;border-radius:99px;background:rgba(255,255,255,.22);display:grid;place-items:center;font-size:4.5px;font-weight:700}}
.pc-info{{min-width:0;flex:1;display:flex;flex-direction:column}}
.pc-info h3{{font-size:{d['h_card']}px;font-weight:600;line-height:1.3;letter-spacing:-.01em;
  display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;min-height:{2.6*d['h_card']}px}}
.pc-meta{{display:flex;align-items:center;gap:7px;color:{d['texto_3']};font-size:{d['meta']}px;margin-top:7px;flex-wrap:wrap}}
.pc-meta .sep{{width:3px;height:3px;border-radius:99px;background:{d['borda_forte']}}}
.etiqueta{{display:inline-flex;align-items:center;gap:5px;height:20px;padding:0 7px;border-radius:5px;
  font-size:{d['meta']-1}px;font-weight:600;border:1px solid transparent}}
.etiqueta.pub{{background:{d['acento_soft']};color:{d['acento']};border-color:{d['acento']}22}}
.etiqueta.ras{{background:{d['canvas']};color:{d['texto_2']};border-color:{d['borda_forte']}}}
.pc-acao{{display:flex;align-items:center;gap:2px;margin-top:auto;padding:{d['pad_card']-4}px {d['pad_card']}px;
  border-top:1px solid {d['borda']}}}
.pc-acao .btn{{height:26px;padding:0 8px;font-size:{d['meta']}px;color:{d['texto_2']}}}
.pc-acao .btn:hover{{background:{d['canvas']};color:{d['texto']}}}
.pc-acao .btn.abrir{{color:{d['acento']};font-weight:600}}
.rodape-gal{{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-top:auto;
  padding:12px {30 if not denso else 22}px;color:{d['texto_3']};font-size:{d['meta']}px;border-top:1px solid {d['borda']}}}
.rodape-gal a{{color:{d['acento']};text-decoration:none;font-weight:600}}

@media (max-width:520px){{
  .top{{height:52px;padding:0 12px;gap:8px}}
  .crumb,.busca,.btn-pauta,.rotulo{{display:none}}
  .marca{{font-size:13px}}
  .pager{{height:30px}}
  .pager button{{width:24px;height:24px}}
  .corpo{{grid-template-columns:1fr}}
  .painel{{display:none}}
  .palco-topo{{padding:0 12px;height:38px}}
  .palco-topo .tag.direita{{display:none}}
  .slide-area{{padding:10px}}
  .slide{{width:min(84vw,286px);padding:22px}}
  .slide h3{{font-size:21px}}
  .slide p{{font-size:11.5px;margin-top:10px}}
  .fita{{height:74px;padding:0 10px;gap:6px}}
  .fita .mini,.fita .mais{{width:34px;height:43px}}
  .gal-cab{{padding:16px 14px 0}}
  .gal-tit{{align-items:flex-start}}
  .gal-tit h1{{font-size:22px}}
  .gal-tit .sub{{font-size:13px;margin-top:5px}}
  .gal-tit .acoes{{width:100%;margin-top:12px}}
  .gal-tit .acoes .btn-primario{{width:100%}}
  .filtros{{flex-wrap:nowrap;overflow:hidden;margin:13px 0}}
  .grid{{grid-template-columns:1fr;gap:7px;padding:0 14px 14px}}
  .pc-info .pc-meta{{margin-top:4px}}
  .etiqueta{{height:18px;font-size:10px}}
  .pc-topo{{gap:10px;padding:9px 10px}}
  .thumb{{width:44px;padding:5px}}
  .thumb .tt{{font-size:6.5px}}
  .thumb .hd{{display:none}}
  .pc-info h3{{font-size:13px;min-height:0;-webkit-line-clamp:2}}
  .pc-acao{{padding:5px 10px}}
  .pc-acao .btn{{height:24px;font-size:11px}}
  .rodape-gal{{padding:11px 14px;font-size:11px}}
}}
"""


def topo_editor(d):
    return f"""
<div class="top">
  <div class="marca"><span class="selo">{ICONES['marca']}</span>Carrossel</div>
  <div class="crumb"><span>/</span><b>Fiscalização na estética: 7 pontos</b></div>
  <div class="espaco"></div>
  <div class="pager">
    <button aria-label="Slide anterior">{ICONES['seta-esq']}</button>
    <span class="cont num">1 / 7</span>
    <button aria-label="Próximo slide">{ICONES['seta-dir']}</button>
  </div>
  <button class="btn btn-linha btn-pauta ico">{ICONES['pauta']}<span>Pauta</span></button>
  <button class="btn btn-primario ico">{ICONES['download']}<span>Exportar PNGs</span></button>
</div>"""


def painel_esq(d):
    return f"""
<aside class="painel">
  <div class="secao">
    <h2>Marca</h2>
    <div class="marca-card">
      <div class="avatar">AC</div>
      <div><div class="nm">AutoClinic</div><div class="hd">@autoclinic</div></div>
    </div>
    <div class="ajuda">Vem da organização. Mudar aqui vale só para este carrossel.</div>
  </div>
  <div class="secao">
    <h2>Slide 1 <span class="cnt" style="text-transform:none;letter-spacing:0">capa</span></h2>
    <div class="campo"><label for="t1">Título</label><input id="t1" value="Fiscalização na estética"></div>
    <div class="campo"><label for="t2">Subtítulo</label><input id="t2" value="7 pontos que a Vigilância olha antes de autuar"></div>
    <div class="campo"><label>Fundo</label>
      <div class="swatches">
        <span class="sw on" style="background:#123B32"></span>
        <span class="sw" style="background:#242743"></span>
        <span class="sw" style="background:#3A2A1B"></span>
        <span class="sw" style="background:#1B2532"></span>
        <span class="sw" style="background:#F1EFE9"></span>
      </div>
    </div>
  </div>
  <div class="secao">
    <h2>Tipografia do slide</h2>
    <div class="seg"><button class="on">Montserrat</button><button>PT Serif</button><button>Inter</button></div>
    <div class="linha-lista" style="margin-top:10px"><b>Tamanho</b><span class="num">27 px</span></div>
    <div class="linha-lista"><b>Alinhamento</b><span>à esquerda</span></div>
    <div class="linha-lista"><b>Entrelinha</b><span class="num">1,16</span></div>
  </div>
  <div class="secao">
    <h2>Fundo do slide</h2>
    <div class="seg" style="margin-bottom:9px"><button class="on">Cor sólida</button><button>Degradê</button><button>Grade</button></div>
    <div class="linha-lista"><b>Contraste do texto</b><span>alto</span></div>
    <div class="linha-lista"><b>Logo no rodapé</b><span>ligado</span></div>
    <div class="linha-lista"><b>Numeração</b><span class="num">1 / 7</span></div>
  </div>
</aside>"""


def painel_dir(d):
    itens = [
        ("Vigilância Sanitária", "10,0", "Clínica de estética é interditada após fiscalização encontrar medicamentos vencidos"),
        ("Anvisa", "8,6", "Nova regra para harmonização facial entra em consulta pública"),
        ("Sebrae", "7,9", "Precificação de serviços: o erro que come a margem do protocolo"),
        ("CFO", "7,4", "Resolução sobre prontuário eletrônico entra em vigor em janeiro"),
    ]
    linhas = "".join(f"""
      <div class="item-pauta">
        <div class="fonte"><b>{o}</b><span class="nota num">nota {n}</span></div>
        <div class="tt">{t}</div>
        <div class="bt"><button class="btn btn-linha">Gerar slides</button><button class="btn btn-ghost">Ver</button></div>
      </div>""" for o, n, t in itens)
    return f"""
<aside class="painel dir pauta">
  <div class="secao">
    <h2>Pauta de hoje <span class="cnt num">4</span></h2>
    {linhas}
    <button class="btn btn-ghost" style="margin-top:8px;padding-left:0">Ver fila de conteúdo</button>
  </div>
  <div class="secao">
    <h2>Versões <span class="cnt num">3</span></h2>
    <div class="linha-lista"><b class="num">v4</b><span>há 2 h · Ana Prado</span></div>
    <div class="linha-lista"><b class="num">v3</b><span>há 1 dia · Ana Prado</span></div>
    <div class="linha-lista"><b class="num">v2</b><span>há 3 dias · Clécio Menezes</span></div>
    <button class="btn btn-ghost" style="margin-top:8px;padding-left:0">Restaurar uma versão</button>
  </div>
</aside>"""


def slide_editor(d):
    return f"""
<div class="slide">
  <div class="txt">
    <h3>Fiscalização na estética</h3>
    <p>7 pontos que a Vigilância olha antes de autuar</p>
  </div>
  <div class="rodape">
    <div class="m"><span class="av">AC</span><span>@autoclinic</span></div>
    <span class="num">1 / 7</span>
  </div>
  <div class="sel"></div>
</div>"""


def fita(d):
    slides = [
        ("#123B32", "Fiscalização na estética"),
        ("#143F36", "O que o fiscal pede primeiro"),
        ("#143F36", "Medicamento vencido"),
        ("#143F36", "Prontuário assinado"),
        ("#143F36", "Resíduo com rastreio"),
        ("#143F36", "Pergunte antes de autuar"),
        ("#123B32", "Salve este carrossel"),
    ]
    minis = "".join(
        f'<div class="mini {"on" if i == 0 else ""}" style="background:{c}">'
        f'<span class="mt">{t}</span><span class="n num">{i+1}</span></div>'
        for i, (c, t) in enumerate(slides)
    )
    return f"""
<div class="fita">{minis}<div class="mais">{ICONES['mais']}</div><span class="rotulo">Novo slide</span></div>"""


def editor(d):
    return f"""<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8">
<title>Editor — {d['nome']} — Carrossel AutoClinic</title>
<style>{css(d)}</style></head>
<body>
{topo_editor(d)}
<div class="app"><div class="corpo">
  {painel_esq(d)}
  <div class="palco">
    <div class="palco-topo">
      <span class="salvo"><span class="ponto"></span>Salvo automaticamente</span>
      <span class="tag">·</span>
      <span class="tag num">7 slides · 1080×1350</span>
      <div class="espaco"></div>
      <span class="tag">·</span><span class="tag num">Ajustar 62%</span>
      <div class="espaco"></div>
      <span class="tag direita">Editado há 2 h por Ana Prado</span>
    </div>
    <div class="slide-area">{slide_editor(d)}</div>
    {fita(d)}
  </div>
  {painel_dir(d)}
</div></div>
</body></html>"""


def thumb(p, d):
    t1, t2, cor = p["capa"]
    return f"""<div class="thumb" style="background:{cor}">
      <div class="tt">{t1}</div>
      <div class="hd"><span class="av">AC</span><span>1/{p['slides']}</span></div>
    </div>"""


def card_projeto(d, p):
    etq = ('<span class="etiqueta pub">Link ativo</span>' if p["status"] == "publicado"
           else f'<span class="etiqueta ras">{STATUS_ROTULO[p["status"]]}</span>')
    return f"""
    <article class="pcard">
      <div class="pc-topo">
        {thumb(p, d)}
        <div class="pc-info">
          <h3>{p['titulo']}</h3>
          <div class="pc-meta"><span class="num">v{p['versao']}</span><span class="sep"></span>
            <span class="num">{p['slides']} slides</span><span class="sep"></span><span>{p['quando']}</span></div>
          <div class="pc-meta">{etq}<span>{p['autor']}</span></div>
        </div>
      </div>
      <div class="pc-acao">
        <button class="btn abrir">Abrir</button>
        <button class="btn ico">{ICONES['duplicar']}<span>Duplicar</span></button>
        <span class="espaco"></span>
        <button class="btn ico" aria-label="Histórico de versões">{ICONES['historico']}</button>
      </div>
    </article>"""


def galeria(d):
    cards = "".join(card_projeto(d, p) for p in PROJETOS)
    total = len(PROJETOS)
    pub = sum(1 for p in PROJETOS if p["status"] == "publicado")
    meus = sum(1 for p in PROJETOS if p["autor"] == "Ana Prado")
    ras = sum(1 for p in PROJETOS if p["status"] == "rascunho")
    sem = sum(1 for p in PROJETOS if p["status"] == "sem link")
    return f"""<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8">
<title>Galeria — {d['nome']} — Carrossel AutoClinic</title>
<style>{css(d)}</style></head>
<body>
<div class="gal">
  <div class="top">
    <div class="marca"><span class="selo">{ICONES['marca']}</span>Carrossel</div>
    <div class="espaco"></div>
    <button class="btn btn-ghost ico btn-pauta">{ICONES['pauta']}<span>Fila de conteúdo</span></button>
    <div class="avatar" style="width:26px;height:26px;font-size:10px">AP</div>
  </div>
  <div class="gal-cab">
    <div class="gal-tit">
      <div>
        <h1>Carrosséis</h1>
        <div class="sub"><span class="num">{total}</span> na organização · <span class="num">{pub}</span> com link ativo</div>
      </div>
      <div class="acoes">
        <div class="busca">{ICONES['busca']}<span>Buscar por título</span></div>
        <button class="btn btn-primario ico">{ICONES['mais']}<span>Novo carrossel</span></button>
      </div>
    </div>
    <div class="filtros">
      <button class="chip on">Todos <span class="num">{total}</span></button>
      <button class="chip">Meus <span class="num">{meus}</span></button>
      <button class="chip">Link ativo <span class="num">{pub}</span></button>
      <button class="chip">Rascunhos <span class="num">{ras}</span></button>
      <button class="chip">Sem link <span class="num">{sem}</span></button>
    </div>
  </div>
  <div class="grid">{cards}</div>
  <div class="rodape-gal">
    <span>Ana Prado · AutoClinic</span>
    <a href="#">Abrir fila de conteúdo</a>
  </div>
</div>
</body></html>"""


for slug, d in DIRECOES.items():
    open(os.path.join(OUT, f"editor-{slug}.html"), "w").write(editor(d))
    open(os.path.join(OUT, f"galeria-{slug}.html"), "w").write(galeria(d))
    print("ok", slug)
