import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { criarArmazem } from "./armazem.ts";
import { executarDetalhes, montarEntradaDetalhes } from "./detalhar.ts";
import { leadDeTeste } from "./fixtures/lead.ts";
import type { ClienteApify } from "./apify.ts";
import type { Config } from "./config.ts";

const detalhe = JSON.parse(readFileSync(new URL("./fixtures/lugar-detalhe.json", import.meta.url), "utf8")) as unknown;
const config: Config = {
  cidades: ["São José"], uf: "Santa Catarina", nichos: { barbearia: { termos: ["barbearia"] } },
  limites: { maxPorTermo: 40, tetoUsdPorExecucao: 1, lotePadrao: 25 },
  precosUsd: { lugar: 0.004, detalhe: 0.002, avaliacao: 0.0005, imagem: 0.0005 },
};

test("entrada pede página de detalhe, 4 fotos e 5 avaliações", () => {
  const e = montarEntradaDetalhes(["a", "b"]);
  assert.deepEqual(e.placeIds, ["a", "b"]);
  assert.equal(e.scrapePlaceDetailPage, true);
  assert.equal(e.maxImages, 4);
  assert.equal(e.maxReviews, 5);
});

test("detalha só o lote; quem não voltou continua no lote", async () => {
  const armazem = criarArmazem(mkdtempSync(join(tmpdir(), "cold-")));
  armazem.salvarLead(leadDeTeste({ slug: "um", placeId: "ChIJteste000000000000001", fase: "lote", score: 90 }));
  armazem.salvarLead(leadDeTeste({ slug: "dois", placeId: "ChIJdois", fase: "lote", score: 80 }));
  armazem.salvarLead(leadDeTeste({ slug: "tres", placeId: "ChIJtres", fase: "candidato" }));
  let entrada: Record<string, unknown> = {};
  const cliente: ClienteApify = {
    saldo: async () => ({ limiteUsd: 5, usadoUsd: 1 }),
    rodar: async (input) => { entrada = input; return { runId: "r7", itens: [detalhe] }; },
  };
  const baixar = async (urls: string[], destino: string) => urls.map((_, i) => `${destino}/${i + 1}.jpg`);
  const r = await executarDetalhes({}, { cliente, armazem, config, agora: () => new Date("2026-10-10T12:00:00Z"), baixar });
  assert.deepEqual(entrada.placeIds, ["ChIJteste000000000000001", "ChIJdois"]);
  assert.deepEqual(r, { detalhados: ["um"], semDados: ["dois"] });
  const um = armazem.listarLeads().find((l) => l.slug === "um");
  assert.equal(um?.fase, "detalhado");
  assert.deepEqual(um?.detalhes?.fotos, ["sites/public/fotos/um/1.jpg", "sites/public/fotos/um/2.jpg"]);
  assert.equal(um?.detalhes?.reviews.length, 2);
  assert.equal(armazem.listarLeads().find((l) => l.slug === "dois")?.fase, "lote");
  assert.equal(armazem.lerUso()[0].comando, "detalhar");
  assert.ok(Math.abs(armazem.lerUso()[0].gastoEstimadoUsd - (0.006 + 2 * 0.0005 + 2 * 0.0005)) < 1e-9);
});

test("sem lote, não chama a Apify", async () => {
  const armazem = criarArmazem(mkdtempSync(join(tmpdir(), "cold-")));
  let chamou = false;
  const cliente: ClienteApify = {
    saldo: async () => { chamou = true; return { limiteUsd: 5, usadoUsd: 1 }; },
    rodar: async () => { chamou = true; return { runId: "x", itens: [] }; },
  };
  const r = await executarDetalhes({}, { cliente, armazem, config, agora: () => new Date(), baixar: async () => [] });
  assert.deepEqual(r, { detalhados: [], semDados: [] });
  assert.equal(chamou, false);
});
