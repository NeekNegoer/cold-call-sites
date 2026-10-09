import { test } from "node:test";
import assert from "node:assert/strict";
import { podeRodar, mensagemSemSaldo, validarTeto } from "./custo.ts";

test("teto abaixo do mínimo da Apify é recusado", () => {
  assert.throws(() => validarTeto(0.2), /teto mínimo da Apify/);
  assert.doesNotThrow(() => validarTeto(0.5));
});

test("só roda se o saldo cobre o teto", () => {
  assert.equal(podeRodar({ limiteUsd: 5, usadoUsd: 1 }, 1), true);
  assert.equal(podeRodar({ limiteUsd: 5, usadoUsd: 4 }, 1), true);
  assert.equal(podeRodar({ limiteUsd: 5, usadoUsd: 4.5 }, 1), false);
});

test("mensagem diz quanto resta e o teto", () => {
  assert.match(mensagemSemSaldo({ limiteUsd: 5, usadoUsd: 4.5 }, 1), /restam US\$0\.50.*teto.*US\$1\.00/);
});
