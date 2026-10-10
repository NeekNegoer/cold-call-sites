import { parseArgs } from "node:util";
import { fileURLToPath } from "node:url";
import { carregarConfig } from "../config.ts";
import { criarArmazem } from "../armazem.ts";
import { escolherLote } from "../lote.ts";
import { hojeEmSaoPaulo } from "../datas.ts";

const { values } = parseArgs({
  options: { quantidade: { type: "string" }, nicho: { type: "string" }, cidade: { type: "string" } },
});
const config = carregarConfig();
const armazem = criarArmazem(fileURLToPath(new URL("../../", import.meta.url)));
const agora = new Date();
const quantidade = values.quantidade ? Number(values.quantidade) : config.limites.lotePadrao;

const lote = escolherLote(armazem.listarLeads(), quantidade, { nicho: values.nicho, cidade: values.cidade });
if (lote.length === 0) {
  console.log("Nenhum candidato disponível. Rode `npm run buscar` antes.");
  process.exit(0);
}
const hoje = hojeEmSaoPaulo(agora);
for (const l of lote) armazem.salvarLead({ ...l, fase: "lote", lote: hoje });
console.log(`Lote de ${hoje}: ${lote.length} leads. Próximo passo: npm run painel:construir e publicar o painel.`);
console.table(lote.map((l) => ({ score: l.score, nome: l.nome, cidade: l.cidade, telefone: l.telefone })));
