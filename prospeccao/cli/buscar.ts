import { parseArgs } from "node:util";
import { fileURLToPath } from "node:url";
import { carregarConfig } from "../config.ts";
import { criarArmazem } from "../armazem.ts";
import { criarClienteApify } from "../apify.ts";
import { executarBusca } from "../buscar.ts";

const USO =
  'Uso: npm run buscar -- --nicho barbearia --cidade "São José" [--bairro Kobrasol] [--termos "a,b"] [--max-por-termo 40] [--teto-usd 1]';

const { values } = parseArgs({
  options: {
    nicho: { type: "string" },
    cidade: { type: "string" },
    bairro: { type: "string" },
    termos: { type: "string" },
    "max-por-termo": { type: "string" },
    "teto-usd": { type: "string" },
  },
});

const token = process.env.APIFY_TOKEN;
if (!token) {
  console.error("Falta APIFY_TOKEN no arquivo .env (modelo em .env.example).");
  process.exit(1);
}
if (!values.nicho || !values.cidade) {
  console.error(USO);
  process.exit(1);
}

try {
  const r = await executarBusca(
    {
      nicho: values.nicho,
      cidade: values.cidade,
      bairro: values.bairro,
      termos: values.termos?.split(",").map((t) => t.trim()).filter(Boolean),
      maxPorTermo: values["max-por-termo"] ? Number(values["max-por-termo"]) : undefined,
      tetoUsd: values["teto-usd"] ? Number(values["teto-usd"]) : undefined,
    },
    {
      cliente: criarClienteApify(token),
      armazem: criarArmazem(fileURLToPath(new URL("../../", import.meta.url))),
      config: carregarConfig(),
      agora: () => new Date(),
    },
  );
  const descartes = Object.entries(r.descartes).filter(([, n]) => n > 0).map(([m, n]) => `${m}: ${n}`);
  console.log(`${r.lugares} lugares encontrados · ${r.novos.length} candidatos novos`);
  console.log(`Descartados: ${descartes.join(" · ") || "nenhum"}`);
  console.table(
    r.novos.slice(0, 15).map((l) => ({
      score: l.score,
      nome: l.nome,
      bairro: l.bairro ?? "",
      tipo: l.classificacao,
      nota: l.nota ?? "-",
      avaliacoes: l.avaliacoes,
      celular: l.celular ? "sim" : "não",
    })),
  );
} catch (e) {
  console.error((e as Error).message);
  process.exit(1);
}
