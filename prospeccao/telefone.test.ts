import { test } from "node:test";
import assert from "node:assert/strict";
import { digitosNacionais, ehCelular, linkWhatsApp } from "./telefone.ts";

test("celular em vários formatos", () => {
  for (const t of ["(48) 99123-4567", "+55 48 99123-4567", "+5548991234567", "(048) 99123-4567", "48 9 9123 4567"]) {
    assert.equal(digitosNacionais(t), "48991234567", t);
    assert.equal(ehCelular(t), true, t);
    assert.equal(linkWhatsApp(t), "https://wa.me/5548991234567", t);
  }
});

test("fixo, 0800 e número sem DDD não são celular", () => {
  for (const t of ["(48) 3241-1234", "+55 48 3241-1234", "0800 123 4567", "99123-4567", ""]) {
    assert.equal(ehCelular(t), false, t);
    assert.equal(linkWhatsApp(t), null, t);
  }
});

test("DDD 55 (RS) não é confundido com o código do país", () => {
  assert.equal(digitosNacionais("(55) 99123-4567"), "55991234567");
  assert.equal(ehCelular("(55) 99123-4567"), true);
});
