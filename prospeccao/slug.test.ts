import { test } from "node:test";
import assert from "node:assert/strict";
import { gerarSlug } from "./slug.ts";

test("remove acentos e símbolos", () => {
  assert.equal(gerarSlug("Barbearia do Zé", new Set()), "barbearia-do-ze");
  assert.equal(gerarSlug("Estética & Cia.", new Set()), "estetica-cia");
});

test("colisão recebe sufixo numérico", () => {
  assert.equal(gerarSlug("Barbearia do Zé", new Set(["barbearia-do-ze"])), "barbearia-do-ze-2");
  assert.equal(
    gerarSlug("Barbearia do Zé", new Set(["barbearia-do-ze", "barbearia-do-ze-2"])),
    "barbearia-do-ze-3",
  );
});

test("nome sem letras nem números vira 'lead'", () => {
  assert.equal(gerarSlug("💈💈", new Set()), "lead");
});

test("nome longo fica com até 60 caracteres e sem hífen no fim", () => {
  const s = gerarSlug("Barbearia e Estética Masculina Dom Pedro Segundo Unidade Kobrasol São José", new Set());
  assert.ok(s.length <= 60);
  assert.ok(!s.endsWith("-"));
  assert.ok(s.startsWith("barbearia-e-estetica-masculina"));
});
