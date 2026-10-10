import { test } from "node:test";
import assert from "node:assert/strict";
import { ITERACOES, criptografar, descriptografar } from "./cripto.js";

test("abre com a senha certa e não abre com a errada", async () => {
  const cofre = await criptografar('{"leads":[{"nome":"Barbearia Zé"}]}', "senha certa", 1000);
  assert.equal(await descriptografar(cofre, "senha certa"), '{"leads":[{"nome":"Barbearia Zé"}]}');
  assert.equal(await descriptografar(cofre, "senha errada"), null);
});

test("o cofre não carrega o texto aberto e muda a cada geração", async () => {
  const a = await criptografar("+55 48 99999-0001", "s", 1000);
  const b = await criptografar("+55 48 99999-0001", "s", 1000);
  assert.ok(!JSON.stringify(a).includes("99999"));
  assert.notEqual(a.dados, b.dados);
  assert.notEqual(a.sal, b.sal);
});

test("texto grande passa inteiro", async () => {
  const grande = "x".repeat(300_000);
  assert.equal(await descriptografar(await criptografar(grande, "s", 1000), "s"), grande);
});

test("o padrão usa pelo menos 600 mil iterações", () => {
  assert.ok(ITERACOES >= 600_000);
});
