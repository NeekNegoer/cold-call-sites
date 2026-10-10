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

function clienteQueAnota() {
  const chamadas = { saldo: 0, rodar: 0, entrada: {} as Record<string, unknown> };
  const cliente: ClienteApify = {
    saldo: async () => {
      chamadas.saldo++;
      return { limiteUsd: 5, usadoUsd: 1 };
    },
    rodar: async (input) => {
      chamadas.rodar++;
      chamadas.entrada = input;
      return { runId: "r7", itens: [detalhe] };
    },
  };
  return { cliente, chamadas };
}
const baixar = async (urls: string[], destino: string) => urls.map((_, i) => `${destino}/${i + 1}.jpg`);

test("detalha só os leads pedidos; quem não voltou continua no lote", async () => {
  const armazem = criarArmazem(mkdtempSync(join(tmpdir(), "cold-")));
  armazem.salvarLead(leadDeTeste({ slug: "um", placeId: "ChIJteste000000000000001", fase: "lote", score: 90 }));
  armazem.salvarLead(leadDeTeste({ slug: "dois", placeId: "ChIJdois", fase: "lote", score: 80 }));
  armazem.salvarLead(leadDeTeste({ slug: "tres", placeId: "ChIJtres", fase: "lote", score: 99 }));
  const { cliente, chamadas } = clienteQueAnota();
  const r = await executarDetalhes(
    { slugs: ["dois", "um", "um"] },
    { cliente, armazem, config, agora: () => new Date("2026-10-10T12:00:00Z"), baixar },
  );
  assert.deepEqual(chamadas.entrada.placeIds, ["ChIJdois", "ChIJteste000000000000001"]);
  assert.deepEqual(r, { detalhados: ["um"], semDados: ["dois"], jaDetalhados: [] });
  const um = armazem.listarLeads().find((l) => l.slug === "um");
  assert.equal(um?.fase, "detalhado");
  assert.deepEqual(um?.detalhes?.fotos, ["sites/public/fotos/um/1.jpg", "sites/public/fotos/um/2.jpg"]);
  assert.equal(um?.detalhes?.reviews.length, 2);
  assert.equal(armazem.listarLeads().find((l) => l.slug === "dois")?.fase, "lote");
  assert.equal(armazem.listarLeads().find((l) => l.slug === "tres")?.fase, "lote");
  assert.equal(armazem.lerUso()[0].comando, "detalhar");
  assert.ok(Math.abs(armazem.lerUso()[0].gastoEstimadoUsd - (0.006 + 2 * 0.0005 + 2 * 0.0005)) < 1e-9);
});

test("sem slug, slug desconhecido ou lead fora do caderno: recusa antes de chamar a Apify", async () => {
  const armazem = criarArmazem(mkdtempSync(join(tmpdir(), "cold-")));
  armazem.salvarLead(leadDeTeste({ slug: "um", fase: "lote" }));
  armazem.salvarLead(leadDeTeste({ slug: "cand", fase: "candidato" }));
  const { cliente, chamadas } = clienteQueAnota();
  const deps = { cliente, armazem, config, agora: () => new Date(), baixar };
  await assert.rejects(executarDetalhes({ slugs: [] }, deps), /npm run detalhar -- <slug>/);
  await assert.rejects(executarDetalhes({ slugs: ["um", "nao-existe"] }, deps), /Lead não encontrado: nao-existe/);
  await assert.rejects(executarDetalhes({ slugs: ["cand"] }, deps), /ainda não estão no caderno.*cand/i);
  assert.deepEqual(chamadas, { saldo: 0, rodar: 0, entrada: {} });
});

test("lead já detalhado não é pago de novo", async () => {
  const armazem = criarArmazem(mkdtempSync(join(tmpdir(), "cold-")));
  armazem.salvarLead(leadDeTeste({ slug: "um", fase: "detalhado" }));
  const { cliente, chamadas } = clienteQueAnota();
  const r = await executarDetalhes({ slugs: ["um"] }, { cliente, armazem, config, agora: () => new Date(), baixar });
  assert.deepEqual(r, { detalhados: [], semDados: [], jaDetalhados: ["um"] });
  assert.equal(chamadas.saldo + chamadas.rodar, 0);
});
