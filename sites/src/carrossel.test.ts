import { test } from "node:test";
import assert from "node:assert/strict";
import { indiceVisivel, proximoIndice } from "./carrossel.ts";

test("índice do cartão visível a partir da rolagem, arredondando para o mais próximo", () => {
  assert.equal(indiceVisivel(0, 372, 3), 0);
  assert.equal(indiceVisivel(200, 372, 3), 1);
  assert.equal(indiceVisivel(744, 372, 3), 2);
  assert.equal(indiceVisivel(5000, 372, 3), 2);
  assert.equal(indiceVisivel(-30, 372, 3), 0);
  assert.equal(indiceVisivel(100, 0, 3), 0);
});

test("setas param nas pontas, sem dar a volta", () => {
  assert.equal(proximoIndice(0, 3, 1), 1);
  assert.equal(proximoIndice(2, 3, 1), 2);
  assert.equal(proximoIndice(0, 3, -1), 0);
});
