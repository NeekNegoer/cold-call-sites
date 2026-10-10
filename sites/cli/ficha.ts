import { fileURLToPath } from "node:url";
import { criarFicha } from "../src/ficha/criar.ts";

const slug = process.argv[2];
if (!slug) {
  console.error("Uso: npm run ficha <slug>");
  process.exit(1);
}
try {
  const r = criarFicha({ raiz: fileURLToPath(new URL("../../", import.meta.url)), slug });
  console.log(`Rascunho criado: sites/src/fichas/${slug}.json (layout ${r.ficha.layout}, ${r.ficha.fotos.length} fotos, ${r.ficha.depoimentos.length} depoimentos).`);
  if (r.pendencias.length) console.log(`Pendências:\n- ${r.pendencias.join("\n- ")}`);
  console.log("Próximo passo: personalizar a ficha e marcar rascunho: false.");
} catch (e) {
  console.error((e as Error).message);
  process.exit(1);
}
