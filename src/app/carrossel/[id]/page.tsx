import { redirect } from "next/navigation";

/**
 * `/carrossel/<id>` — a ficha do carrossel antigo também saiu do ar.
 *
 * Decisão do Igor em 22/11/2026: começar do zero no sistema novo, sem manter os
 * carrosséis do editor antigo. A ficha lia `GET /api/carrossel/carrosseis/<id>`
 * — com os dados apagados ela responderia 404 e, para quem tem o link salvo
 * (inclusive `/p/<token>` de quem recebeu a peça), pareceria defeito.
 *
 * Aqui a resposta é sempre a mesma: volta para o estúdio com um aviso em texto
 * de gente. O `next.config.js` já faz esse 307 antes de chegar nesta página;
 * este `redirect()` existe para o caso de a config não estar em jogo.
 *
 * A leitura pública (`/p/<token>`) é outra rota e não muda aqui.
 */
export default function PaginaDoCarrosselAntigo() {
  redirect("/?aviso=antigo");
}
