import type { Modo } from "../modo.ts";
import { layoutsDoNicho } from "../tema/layouts.ts";
import type { Ficha } from "./tipos.ts";
import { validarFicha } from "./validar.ts";

export interface Pagina {
  caminho: string;
  ficha: Ficha;
}

const nomeDoArquivo = (caminho: string) => caminho.split("/").pop() ?? caminho;

// Fichas reais viram <slug>-<sufixo>; cada ficha de exemplo vira uma página por layout do seu nicho.
export function paginas(fichas: Record<string, unknown>, exemplos: Record<string, unknown>, modo: Modo): Pagina[] {
  const lista: Pagina[] = [];
  if (modo !== "exemplos") {
    for (const [caminho, dado] of Object.entries(fichas)) {
      const arquivo = `sites/src/fichas/${nomeDoArquivo(caminho)}`;
      const ficha = validarFicha(dado, arquivo);
      if (ficha.slug.startsWith("exemplo-")) throw new Error(`${arquivo}: o prefixo exemplo- é reservado às fichas fictícias`);
      if (nomeDoArquivo(caminho) !== `${ficha.slug}.json`) throw new Error(`${arquivo}: o nome do arquivo precisa ser ${ficha.slug}.json`);
      lista.push({ caminho: `${ficha.slug}-${ficha.sufixo}`, ficha });
      // No computador, a mesma ficha nos outros layouts do nicho (com o tema padrão de cada um), para comparar e escolher.
      if (modo === "local") {
        for (const l of layoutsDoNicho(ficha.nicho).filter((x) => x.id !== ficha.layout)) {
          lista.push({ caminho: `${ficha.slug}-${ficha.sufixo}-${l.id}`, ficha: { ...ficha, layout: l.id, tema: l.temaPadrao } });
        }
      }
    }
  }
  if (modo !== "publicar") {
    for (const [caminho, dado] of Object.entries(exemplos)) {
      const arquivo = `sites/src/exemplos/${nomeDoArquivo(caminho)}`;
      const ficha = validarFicha(dado, arquivo);
      if (!ficha.slug.startsWith("exemplo-")) throw new Error(`${arquivo}: fichas de exemplo começam com exemplo-`);
      for (const l of layoutsDoNicho(ficha.nicho)) {
        lista.push({ caminho: `${ficha.slug}-${l.id}`, ficha: { ...ficha, layout: l.id, tema: l.temaPadrao } });
      }
    }
  }
  const caminhos = lista.map((p) => p.caminho);
  const repetido = caminhos.find((c, i) => caminhos.indexOf(c) !== i);
  if (repetido) throw new Error(`Duas prévias com o mesmo caminho: ${repetido}`);
  return lista.sort((a, b) => a.caminho.localeCompare(b.caminho));
}
