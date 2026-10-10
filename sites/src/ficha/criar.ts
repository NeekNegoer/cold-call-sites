import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";
import { criarArmazem } from "../../../prospeccao/armazem.ts";
import { rascunhoDaFicha, type Nichos } from "./rascunho.ts";
import type { Ficha } from "./tipos.ts";

const LETRAS = "abcdefghijklmnopqrstuvwxyz0123456789";

// O sufixo deixa o link da prévia impossível de adivinhar pelo nome do negócio.
export function sortearSufixo(): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(4)), (b) => LETRAS[b % LETRAS.length]).join("");
}

export function criarFicha(o: { raiz: string; slug: string; sortear?: () => string }): { arquivo: string; ficha: Ficha; pendencias: string[] } {
  const lead = criarArmazem(o.raiz).listarLeads().find((l) => l.slug === o.slug);
  if (!lead) throw new Error(`Lead não encontrado: ${o.slug}`);
  if (lead.fase !== "detalhado") throw new Error(`${o.slug} ainda não foi detalhado: rode npm run detalhar -- ${o.slug}`);
  const arquivo = join(o.raiz, "sites", "src", "fichas", `${o.slug}.json`);
  if (existsSync(arquivo)) throw new Error(`Já existe sites/src/fichas/${o.slug}.json. Para recomeçar, apague o arquivo.`);
  const nichos = JSON.parse(readFileSync(new URL("../../nichos.json", import.meta.url), "utf8")) as Nichos;
  const pendencias: string[] = [];
  const presentes = (lead.detalhes?.fotos ?? []).filter((f) => {
    const existe = existsSync(join(o.raiz, f));
    if (!existe) pendencias.push(`Foto não encontrada: ${f}`);
    return existe;
  });
  const r = rascunhoDaFicha(lead, { nichos, sufixo: (o.sortear ?? sortearSufixo)(), fotos: presentes.map((f) => basename(f)) });
  const pastaFotos = join(o.raiz, "sites", "src", "fotos", o.slug);
  mkdirSync(pastaFotos, { recursive: true });
  for (const f of presentes) copyFileSync(join(o.raiz, f), join(pastaFotos, basename(f)));
  mkdirSync(join(o.raiz, "sites", "src", "fichas"), { recursive: true });
  writeFileSync(arquivo, JSON.stringify(r.ficha, null, 2) + "\n");
  return { arquivo, ficha: r.ficha, pendencias: [...pendencias, ...r.pendencias] };
}
