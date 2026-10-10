import { test } from "node:test";
import assert from "node:assert/strict";
import { contraste, corDoTextoSobre, hexValido } from "./contraste.ts";

test("contraste segue a fórmula da WCAG e não depende da ordem", () => {
  assert.equal(Number(contraste("#000000", "#ffffff").toFixed(2)), 21);
  assert.equal(contraste("#777777", "#777777"), 1);
  assert.equal(Number(contraste("#767676", "#ffffff").toFixed(2)), 4.54);
  assert.equal(contraste("#ffffff", "#767676"), contraste("#767676", "#ffffff"));
});

test("texto do botão: preto sobre destaque claro, branco sobre destaque escuro", () => {
  assert.equal(corDoTextoSobre("#ffd400"), "#000000");
  assert.equal(corDoTextoSobre("#7a1f1f"), "#ffffff");
});

test("hexValido aceita só #rrggbb", () => {
  assert.ok(hexValido("#a1B2c3"));
  for (const h of ["a1b2c3", "#abc", "#a1b2c3ff", "red", ""]) assert.ok(!hexValido(h), h);
});
