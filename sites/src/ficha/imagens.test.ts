import { test } from "node:test";
import assert from "node:assert/strict";
import { fichaValida } from "./fixtures.ts";
import { indexarFotos, resolverImagens } from "./imagens.ts";

test("indexa por pasta/arquivo e resolve as fotos e as fotos dos profissionais", () => {
  const indice = indexarFotos({ "./fotos/barbearia-teste/1.jpg": { default: "img1" }, "./exemplos/fotos/exemplo-x/1.jpg": { default: "ex1" } });
  assert.deepEqual([...indice.keys()], ["barbearia-teste/1.jpg", "exemplo-x/1.jpg"]);
  const r = resolverImagens(fichaValida({ profissionais: [{ nome: "Ana", foto: "1.jpg" }, { nome: "Bia" }] }), indice);
  assert.deepEqual(r.fotos, [{ arquivo: "1.jpg", alt: "Fachada", imagem: "img1" }]);
  assert.deepEqual(r.profissionais, [{ nome: "Ana", foto: "1.jpg", imagem: "img1" }, { nome: "Bia", imagem: null }]);
});

test("foto que falta dá erro com o caminho esperado", () => {
  assert.throws(
    () => resolverImagens(fichaValida({ fotos: [{ arquivo: "3.jpg", alt: "x" }] }), new Map()),
    /barbearia-teste: foto 3\.jpg não encontrada em sites\/src\/fotos\/barbearia-teste\//,
  );
});
