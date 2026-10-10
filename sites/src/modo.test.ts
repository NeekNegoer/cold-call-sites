import { test } from "node:test";
import assert from "node:assert/strict";
import { modoAtual } from "./modo.ts";

test("sem PREVIAS_MODO o build é local; aceita só os três modos", () => {
  assert.equal(modoAtual(""), "local");
  for (const m of ["local", "publicar", "exemplos"] as const) assert.equal(modoAtual(m), m);
  assert.throws(() => modoAtual("x"), /PREVIAS_MODO inválido: x \(use local, publicar ou exemplos\)/);
});
