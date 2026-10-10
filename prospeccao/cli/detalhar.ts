import { parseArgs } from "node:util";
import { fileURLToPath } from "node:url";
import { carregarConfig } from "../config.ts";
import { criarArmazem } from "../armazem.ts";
import { criarClienteApify } from "../apify.ts";
import { executarDetalhes } from "../detalhar.ts";
import { baixarFotos } from "../fotos.ts";

const { values, positionals } = parseArgs({ options: { "teto-usd": { type: "string" } }, allowPositionals: true });
if (positionals.length === 0) {
  console.error("Diga quais leads detalhar: npm run detalhar -- <slug> [<slug>...]");
  process.exit(1);
}
const token = process.env.APIFY_TOKEN;
if (!token) {
  console.error("Falta APIFY_TOKEN no arquivo .env (modelo em .env.example).");
  process.exit(1);
}
const raiz = fileURLToPath(new URL("../../", import.meta.url));
try {
  const r = await executarDetalhes(
    { slugs: positionals, tetoUsd: values["teto-usd"] ? Number(values["teto-usd"]) : undefined },
    {
      cliente: criarClienteApify(token),
      armazem: criarArmazem(raiz),
      config: carregarConfig(),
      agora: () => new Date(),
      baixar: (urls, destino) => baixarFotos(urls, destino, raiz),
    },
  );
  console.log(`Detalhados: ${r.detalhados.length} · sem dados: ${r.semDados.length}`);
  if (r.semDados.length) console.log(`Sem dados (continuam no lote): ${r.semDados.join(", ")}`);
  if (r.jaDetalhados.length) console.log(`Já estavam detalhados, nada foi gasto com eles: ${r.jaDetalhados.join(", ")}`);
} catch (e) {
  console.error((e as Error).message);
  process.exit(1);
}
