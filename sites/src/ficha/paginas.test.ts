import { test } from "node:test";
import assert from "node:assert/strict";
import { fichaValida } from "./fixtures.ts";
import { paginas } from "./paginas.ts";
import type { Ficha } from "./tipos.ts";

const exemplo = (parcial: Partial<Ficha> = {}) => fichaValida({ slug: "exemplo-x", ...parcial });

test("ficha real vira <slug>-<sufixo>; exemplo vira uma página por layout do nicho, com o tema do layout", () => {
  const p = paginas({ "./fichas/barbearia-teste.json": fichaValida() }, { "./exemplos/exemplo-x.json": exemplo() }, "local");
  assert.deepEqual(p.map((x) => x.caminho), ["barbearia-teste-ab12", "exemplo-x-classica", "exemplo-x-minimal", "exemplo-x-moderna-escura"]);
  const minimal = p.find((x) => x.caminho === "exemplo-x-minimal")?.ficha;
  assert.equal(minimal?.layout, "minimal");
  assert.equal(minimal?.tema.fontes, "grotesk-inter");
});

test("publicar ignora os exemplos; exemplos ignora as fichas", () => {
  const fichas = { "./fichas/barbearia-teste.json": fichaValida() };
  const exemplos = { "./exemplos/exemplo-x.json": exemplo() };
  assert.deepEqual(paginas(fichas, exemplos, "publicar").map((x) => x.caminho), ["barbearia-teste-ab12"]);
  assert.equal(paginas(fichas, exemplos, "exemplos").length, 3);
});

test("prefixo exemplo- é reservado e o arquivo precisa se chamar <slug>.json", () => {
  assert.throws(() => paginas({ "./fichas/exemplo-x.json": exemplo() }, {}, "publicar"), /reservado/);
  assert.throws(() => paginas({}, { "./exemplos/barbearia-teste.json": fichaValida() }, "exemplos"), /começam com exemplo-/);
  assert.throws(() => paginas({ "./fichas/outro.json": fichaValida() }, {}, "publicar"), /precisa ser barbearia-teste\.json/);
});

test("duas prévias no mesmo caminho são recusadas", () => {
  const fichas = { "./fichas/barbearia-teste.json": fichaValida(), "./fichas/b/barbearia-teste.json": fichaValida() };
  assert.throws(() => paginas(fichas, {}, "publicar"), /mesmo caminho: barbearia-teste-ab12/);
});
