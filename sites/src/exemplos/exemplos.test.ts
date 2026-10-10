import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { resolverImagens } from "../ficha/imagens.ts";
import { paginas } from "../ficha/paginas.ts";
import type { Ficha } from "../ficha/tipos.ts";

const pasta = new URL("./", import.meta.url);
const exemplos: Record<string, unknown> = Object.fromEntries(
  readdirSync(pasta)
    .filter((f) => f.endsWith(".json"))
    .map((f) => [`./exemplos/${f}`, JSON.parse(readFileSync(new URL(f, pasta), "utf8"))]),
);

test("os 4 exemplos validam e viram 12 páginas", () => {
  assert.equal(Object.keys(exemplos).length, 4);
  assert.equal(paginas({}, exemplos, "exemplos").length, 12);
});

test("toda foto citada nos exemplos existe no disco", () => {
  const fotos = new URL("./fotos/", pasta);
  const indice = new Map<string, string>();
  for (const slug of readdirSync(fotos).filter((f) => f.startsWith("exemplo-"))) {
    for (const arquivo of readdirSync(new URL(`${slug}/`, fotos)).filter((f) => f.endsWith(".jpg"))) indice.set(`${slug}/${arquivo}`, arquivo);
  }
  for (const { ficha } of paginas({}, exemplos, "exemplos")) assert.doesNotThrow(() => resolverImagens(ficha, indice), ficha.slug);
});

test("pior caso de barbearia: sem fotos, sem equipe, nome com caracteres de HTML e horário estimado", () => {
  const pior = exemplos["./exemplos/exemplo-pior-barbearia.json"] as Ficha;
  assert.equal(pior.fotos.length, 0);
  assert.equal(pior.profissionais.length, 0);
  assert.match(pior.nome, /&.*"O Rei da Navalha".*<Desde 1987>/);
  assert.equal(pior.contato.horariosEstimados, true);
});
