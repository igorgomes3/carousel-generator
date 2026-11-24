"use client";

/**
 * Galeria pública de um carrossel — somente leitura.
 *
 * Por que existe: `/p/<token>` desenhava o documento do **editor antigo**
 * (`DocumentSchema`) lido da API antiga. O carrossel agora é independente e o
 * que existe no banco novo é o contrato do estúdio (`ProjetoSalvo`), então a
 * página pública desenha os MESMOS cards que a pessoa aprovou — com o mesmo
 * `Cartao` do estúdio, e não uma segunda renderização que diverge.
 *
 * Largura é medida da janela (390 → 358 px de card; 1440 → 420 px). O card é
 * sempre desenhado em 1080×1440 e escalado por `transform`, então não há perda
 * de layout em nenhum tamanho.
 */
import { Cartao } from "@/components/estudio/cartao";
import { BlocoPublicacao } from "@/components/estudio/bloco-publicacao";
import useWindowDimensions from "@/lib/hooks/use-window-dimensions";
import type { ProjetoSalvo } from "@/lib/estudio/projetos";
import { templatePorId } from "@/lib/templates";

export function GaleriaPublica({ projeto }: { projeto: ProjetoSalvo }) {
  const { width } = useWindowDimensions();
  const template = templatePorId(projeto.templateId);

  // Antes da primeira medida (SSR/hidratação) usa 340: é o que cabe em 390 sem
  // barra de rolagem horizontal.
  const largura = Math.max(240, Math.min(420, (width ?? 372) - 32));

  if (projeto.slides.length === 0) {
    return (
      <p className="py-12 text-center text-sm text-muted-foreground">
        Este carrossel está vazio.
      </p>
    );
  }

  return (
    <div className="flex flex-col items-center gap-6 py-6 select-none">
      {projeto.slides.map((slide, indice) => (
        <div
          key={indice}
          className="overflow-hidden rounded-xl border border-[#E7E5E4] bg-white shadow-sm"
        >
          <Cartao
            slide={slide}
            template={template}
            aparencia={undefined}
            arroba={projeto.arroba}
            guia={false}
            indice={indice}
            total={projeto.slides.length}
            largura={largura}
          />
        </div>
      ))}
      <p className="text-[12px] text-muted-foreground">
        {projeto.slides.length} card{projeto.slides.length === 1 ? "" : "s"} · somente leitura
      </p>

      {/* Quem abre o link também precisa da legenda: é o texto que acompanha o
          post. `compacto` porque aqui ninguém edita. */}
      <div className="w-full px-4">
        <BlocoPublicacao
          legenda={projeto.legenda}
          hashtags={projeto.hashtags}
          melhorHorario={projeto.melhorHorario}
          compacto
        />
      </div>
    </div>
  );
}
