import { test } from "node:test";
import assert from "node:assert/strict";
import { pontuar } from "./pontuacao.ts";

test("máximo é 100", () => {
  assert.equal(pontuar({ avaliacoes: 250, nota: 4.9, celular: true, instagram: "@x" }), 100);
});

test("mínimo é 0", () => {
  assert.equal(pontuar({ avaliacoes: 0, nota: null, celular: false, instagram: null }), 0);
});

test("faixas da nota", () => {
  const base = { avaliacoes: 0, celular: false, instagram: null };
  assert.equal(pontuar({ ...base, nota: 4.5 }), 25);
  assert.equal(pontuar({ ...base, nota: 4.49 }), 15);
  assert.equal(pontuar({ ...base, nota: 4.0 }), 15);
  assert.equal(pontuar({ ...base, nota: 3.5 }), 5);
  assert.equal(pontuar({ ...base, nota: 3.4 }), 0);
});

test("avaliações proporcionais e arredondamento", () => {
  assert.equal(pontuar({ avaliacoes: 37, nota: 4.2, celular: true, instagram: null }), 49);
});
