/**
 * Redirecionamentos da fase 1 do plano de UI.
 *
 * Três endereços morreram e nenhum deles pode virar 404 (§1.4, §8.1 itens 2 e 3):
 *
 *   `/projetos`      → `/`               — a galeria virou a tela inicial;
 *   `/?projeto=<id>` → `/carrossel/<id>` — o editor passou para
 *                                          `/carrossel/<id>/editar`, e o link
 *                                          antigo aterrissa na ficha da peça;
 *   `/fila`          → `/sinais`         — a fila passou a se chamar sinais.
 *
 * `statusCode: 301` e não `permanent: true`: no Next 14 `permanent` responde
 * **308** (medido: `curl /projetos` devolvia 308), e o critério pede 301. Os
 * dois são cacheáveis e preservam método, mas o critério é número, não intenção.
 * O `has` com
 * `type: "query"` é o que captura o id — `redirects` não tem regex de query
 * string, então o valor inteiro vira o parâmetro da rota de destino.
 *
 * @type {import('next').NextConfig}
 */
const nextConfig = {
  async redirects() {
    return [
      {
        // `/projetos` deixou de ser redirect: a issue #13 devolveu o endereço
        // como a tela "Meus projetos" (abrir, renomear, apagar o que foi salvo).
        // Só a fila continua morando em `/sinais`.
        source: "/fila",
        destination: "/sinais",
        statusCode: 301,
      },
    ];
  },
};

module.exports = nextConfig;
