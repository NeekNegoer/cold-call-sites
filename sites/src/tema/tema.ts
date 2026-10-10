import type { Tema } from "../ficha/tipos.ts";
import { CONTRASTE_DESTAQUE, CONTRASTE_TEXTO, contraste, corDoTextoSobre, hexValido } from "./contraste.ts";
import { FONTES, parDeFontes } from "./fontes.ts";

export function problemasDoTema(t: Tema): string[] {
  const erros: string[] = [];
  for (const campo of ["fundo", "superficie", "texto", "destaque"] as const) {
    if (!hexValido(t[campo])) erros.push(`tema.${campo} precisa ser uma cor #rrggbb (recebido: ${t[campo]})`);
  }
  if (!parDeFontes(t.fontes)) erros.push(`tema.fontes desconhecido: ${t.fontes} (use ${FONTES.map((f) => f.id).join(", ")})`);
  if (erros.length) return erros;
  const exigir = (par: string, a: string, b: string, minimo: number) => {
    const c = contraste(a, b);
    if (c < minimo) erros.push(`contraste ${par} é ${c.toFixed(2)}:1, abaixo de ${minimo}:1`);
  };
  exigir("texto × fundo", t.texto, t.fundo, CONTRASTE_TEXTO);
  exigir("texto × superfície", t.texto, t.superficie, CONTRASTE_TEXTO);
  exigir("texto do botão × destaque", corDoTextoSobre(t.destaque), t.destaque, CONTRASTE_TEXTO);
  exigir("destaque × fundo", t.destaque, t.fundo, CONTRASTE_DESTAQUE);
  return erros;
}
