import { test } from "node:test";
import assert from "node:assert/strict";
import { elastico, projetar, simularMola } from "./mola.ts";

test("projeção do gesto segue a fórmula da Apple (desaceleração 0,998)", () => {
  assert.equal(Math.round(projetar(1000)), 499);
  assert.equal(projetar(0), 0);
  assert.ok(projetar(-1000) < 0);
});

test("elástico: resiste cada vez mais e nunca passa do quanto o dedo andou", () => {
  assert.equal(elastico(0, 600), 0);
  const a = elastico(50, 600);
  const b = elastico(200, 600);
  assert.ok(a > 0 && a < 50 && b > a && b < 200);
  assert.equal(elastico(-50, 600), -a);
});

test("mola criticamente amortecida chega ao alvo sem passar dele", () => {
  const trajeto = simularMola({ de: 0, para: 100, velocidade: 0, amortecimento: 1, resposta: 0.4 });
  assert.ok(trajeto.every((x) => x <= 100.0001), "passou do alvo");
  assert.ok(Math.abs(trajeto.at(-1)! - 100) < 0.5);
});

test("mola com amortecimento 0,8 e velocidade inicial passa um pouco do alvo e volta", () => {
  const trajeto = simularMola({ de: 0, para: 100, velocidade: 800, amortecimento: 0.8, resposta: 0.3 });
  const maximo = Math.max(...trajeto);
  assert.ok(maximo > 100 && maximo < 130, `máximo ${maximo}`);
  assert.ok(Math.abs(trajeto.at(-1)! - 100) < 0.5);
});
