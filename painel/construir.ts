import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { criarArmazem } from "../prospeccao/armazem.ts";
import { documentosDoPainel } from "../prospeccao/lote.ts";
import { criptografar } from "./cripto.js";

const caminho = (p: string) => fileURLToPath(new URL(p, import.meta.url));
const MARCA_LOGICA = "/*__LOGICA__*/";
const MARCA_COFRE = "__COFRE__";
export const SENHA_MINIMA = 16;

// Página estática do painel: o código vai aberto, os leads vão só dentro do cofre criptografado.
export async function construirPainel(o: { raiz: string; senha: string | undefined; agora: Date; iteracoes?: number }) {
  if (!o.senha || o.senha.length < SENHA_MINIMA) {
    throw new Error(`Falta PAINEL_SENHA em senha.env, com pelo menos ${SENHA_MINIMA} caracteres.`);
  }
  const pagina = readFileSync(caminho("./pagina.html"), "utf8");
  for (const marca of [MARCA_LOGICA, MARCA_COFRE]) {
    if (!pagina.includes(marca)) throw new Error(`painel/pagina.html precisa conter ${marca}`);
  }
  const codigo = [readFileSync(caminho("./logica.js"), "utf8"), readFileSync(caminho("./cripto.js"), "utf8")].join("\n");
  const leads = documentosDoPainel(criarArmazem(o.raiz).listarLeads()).map((d) => d.data);
  const cofre = await criptografar(JSON.stringify({ geradoEm: o.agora.toISOString(), leads }), o.senha, o.iteracoes);
  const html = pagina.replace(MARCA_LOGICA, () => codigo).replace(MARCA_COFRE, () => JSON.stringify(cofre));
  return { html, leads: leads.length };
}
