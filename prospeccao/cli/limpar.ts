import { rmSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { criarArmazem } from "../armazem.ts";
import { PATCH_LIMPEZA, selecionarParaLimpar, type StatusPainel } from "../limpar.ts";

const raiz = fileURLToPath(new URL("../../", import.meta.url));
const armazem = criarArmazem(raiz);
const status = armazem.lerSistema<StatusPainel[] | null>("painel-status.json", null);
if (!status) {
  console.error("Falta leads/_sistema/painel-status.json. Peça ao Claude para exportar os status do painel antes.");
  process.exit(1);
}
const noPainel = new Set(status.map((s) => s.id));
const slugs = selecionarParaLimpar(armazem.listarLeads(), status, new Date());
for (const slug of slugs) {
  armazem.removerLead(slug);
  rmSync(join(raiz, "sites", "public", "fotos", slug), { recursive: true, force: true });
}
const paraPainel = slugs.filter((s) => noPainel.has(s)).map((id) => ({ id, patch: PATCH_LIMPEZA }));
armazem.gravarSistema("painel-limpar.json", paraPainel);
console.log(`Apagados localmente: ${slugs.length} · para limpar no painel: ${paraPainel.length} (leads/_sistema/painel-limpar.json)`);
