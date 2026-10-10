import { rmSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { criarArmazem } from "../armazem.ts";
import { executarLimpeza } from "../limpar.ts";

const raiz = fileURLToPath(new URL("../../", import.meta.url));
try {
  const r = executarLimpeza({
    armazem: criarArmazem(raiz),
    agora: new Date(),
    apagarFotos: (slug) => rmSync(join(raiz, "sites", "public", "fotos", slug), { recursive: true, force: true }),
  });
  console.log(
    `Apagados localmente: ${r.apagados.length} · para limpar no painel: ${r.paraPainel.length} (leads/_sistema/painel-limpar.json)`,
  );
} catch (e) {
  console.error((e as Error).message);
  process.exit(1);
}
