import { redirect } from "next/navigation";

/**
 * `/carrossel/<id>/editar` — o editor antigo foi desligado.
 *
 * Decisão do Igor em 22/11/2026: não manter os carrosséis antigos, começar do
 * zero no sistema novo. O `next.config.js` já responde 307 para o estúdio antes
 * de chegar aqui; este `redirect()` é a segunda tranca — se a config mudar ou
 * alguém rodar sem ela, a rota continua não mostrando editor nenhum e não
 * devolve 404/500 para quem tem link salvo.
 *
 * O código do editor (`@/components/editor`, `DocumentProvider`) continua no
 * repositório de propósito: desligar a rota não é apagar o componente. Podar a
 * árvore morta é uma tarefa própria, com o histórico de versões que a API do
 * AutoClinic fornecia.
 */
export default function PaginaDoEditorAntigo() {
  redirect("/?aviso=antigo");
}
