import { mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { construirPainel } from "../construir.ts";

const raiz = fileURLToPath(new URL("../../", import.meta.url));
try {
  const r = await construirPainel({ raiz, senha: process.env.PAINEL_SENHA, agora: new Date() });
  mkdirSync(fileURLToPath(new URL("../dist/", import.meta.url)), { recursive: true });
  writeFileSync(fileURLToPath(new URL("../dist/index.html", import.meta.url)), r.html);
  console.log(`painel/dist/index.html gerado com ${r.leads} leads, criptografados com a senha de senha.env`);
} catch (e) {
  console.error((e as Error).message);
  process.exit(1);
}
