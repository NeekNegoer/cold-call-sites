import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { criarArmazem } from "./armazem.ts";
import { executarBusca, montarEntradaBusca } from "./buscar.ts";
import type { ClienteApify, Saldo } from "./apify.ts";
import type { Config } from "./config.ts";

const fixture = JSON.parse(readFileSync(new URL("./fixtures/lugar-busca.json", import.meta.url), "utf8")) as unknown[];
const config: Config = {
  cidades: ["Florianópolis", "São José", "Palhoça", "Biguaçu"],
  uf: "Santa Catarina",
  nichos: { barbearia: { termos: ["barbearia"] } },
  limites: { maxPorTermo: 40, tetoUsdPorExecucao: 1, lotePadrao: 25 },
  precosUsd: { lugar: 0.004, detalhe: 0.002, avaliacao: 0.0005, imagem: 0.0005 },
};
const agora = () => new Date("2026-10-09T19:00:00.000Z");

function clienteFalso(saldos: Saldo[], itens: unknown[] | Error) {
  let rodou = 0;
  const cliente: ClienteApify = {
    saldo: async () => saldos.shift() ?? { limiteUsd: 5, usadoUsd: 1 },
    rodar: async () => {
      rodou++;
      if (itens instanceof Error) throw itens;
      return { runId: "r1", itens };
    },
  };
  return { cliente, rodou: () => rodou };
}

test("monta a entrada barata, sem filtro de website", () => {
  const e = montarEntradaBusca({ nicho: "barbearia", cidade: "São José", bairro: "Kobrasol" }, config);
  assert.equal(e.locationQuery, "Kobrasol, São José, Santa Catarina, Brasil");
  assert.deepEqual(e.searchStringsArray, ["barbearia"]);
  assert.equal(e.maxCrawledPlacesPerSearch, 40);
  assert.equal(e.scrapePlaceDetailPage, false);
  assert.equal(e.maxImages, 0);
  assert.equal(e.maxReviews, 0);
  assert.equal("website" in e, false);
  assert.equal("skipClosedPlaces" in e, false);
});

test("nicho ou cidade fora da config dão erro", () => {
  assert.throws(() => montarEntradaBusca({ nicho: "padaria", cidade: "São José" }, config), /Nicho desconhecido/);
  assert.throws(() => montarEntradaBusca({ nicho: "barbearia", cidade: "Curitiba" }, config), /Cidade fora da região/);
});

test("grava candidatos, vistos e gasto", async () => {
  const armazem = criarArmazem(mkdtempSync(join(tmpdir(), "cold-")));
  const { cliente } = clienteFalso([], fixture);
  const r = await executarBusca({ nicho: "barbearia", cidade: "São José" }, { cliente, armazem, config, agora });
  assert.equal(r.lugares, 3);
  assert.deepEqual(r.novos.map((l) => l.slug), ["barbearia-teste-kobrasol", "studio-teste-sobrancelhas"]);
  assert.equal(r.descartes.site_proprio, 1);
  assert.equal(armazem.listarLeads().length, 2);
  assert.equal(armazem.lerVistos().size, 3);
  const [uso] = armazem.lerUso();
  assert.ok(Math.abs(uso.gastoEstimadoUsd - 3 * 0.004) < 1e-9);
  assert.equal(uso.lugares, 3);
});

test("repetir a busca não duplica leads", async () => {
  const armazem = criarArmazem(mkdtempSync(join(tmpdir(), "cold-")));
  await executarBusca({ nicho: "barbearia", cidade: "São José" }, { cliente: clienteFalso([], fixture).cliente, armazem, config, agora });
  const r = await executarBusca({ nicho: "barbearia", cidade: "São José" }, { cliente: clienteFalso([], fixture).cliente, armazem, config, agora });
  assert.equal(r.novos.length, 0);
  assert.equal(r.descartes.ja_visto, 3);
  assert.equal(armazem.listarLeads().length, 2);
});

test("sem saldo não roda o ator", async () => {
  const armazem = criarArmazem(mkdtempSync(join(tmpdir(), "cold-")));
  const { cliente, rodou } = clienteFalso([{ limiteUsd: 5, usadoUsd: 4.5 }], fixture);
  await assert.rejects(executarBusca({ nicho: "barbearia", cidade: "São José" }, { cliente, armazem, config, agora }), /Saldo da Apify insuficiente/);
  assert.equal(rodou(), 0);
});

test("teto abaixo de US$0,50 é recusado antes de chamar a Apify", async () => {
  const armazem = criarArmazem(mkdtempSync(join(tmpdir(), "cold-")));
  const { cliente, rodou } = clienteFalso([], fixture);
  await assert.rejects(
    executarBusca({ nicho: "barbearia", cidade: "São José", tetoUsd: 0.2 }, { cliente, armazem, config, agora }),
    /teto mínimo/,
  );
  assert.equal(rodou(), 0);
});

test("falha da Apify não grava nada", async () => {
  const armazem = criarArmazem(mkdtempSync(join(tmpdir(), "cold-")));
  const { cliente } = clienteFalso([], new Error("A execução r9 terminou como TIMED-OUT."));
  await assert.rejects(executarBusca({ nicho: "barbearia", cidade: "São José" }, { cliente, armazem, config, agora }), /TIMED-OUT/);
  assert.equal(armazem.listarLeads().length, 0);
  assert.equal(armazem.lerVistos().size, 0);
  assert.equal(armazem.lerUso().length, 0);
});
