import { test } from "node:test";
import assert from "node:assert/strict";
import { documentosDoPainel, escolherLote, paraPainel } from "./lote.ts";
import { leadDeTeste } from "./fixtures/lead.ts";

const leads = [
  leadDeTeste({ slug: "a", score: 40 }),
  leadDeTeste({ slug: "b", score: 90 }),
  leadDeTeste({ slug: "c", score: 70, nicho: "estetica", cidade: "Florianópolis" }),
  leadDeTeste({ slug: "d", score: 99, fase: "lote", lote: "2026-10-08" }),
];

test("pega só candidatos, do maior score para o menor", () => {
  assert.deepEqual(escolherLote(leads, 2).map((l) => l.slug), ["b", "c"]);
});

test("respeita nicho e cidade", () => {
  assert.deepEqual(escolherLote(leads, 25, { nicho: "estetica" }).map((l) => l.slug), ["c"]);
  assert.deepEqual(escolherLote(leads, 25, { cidade: "São José" }).map((l) => l.slug), ["b", "a"]);
});

test("documento do painel começa como novo, com histórico e links", () => {
  const { id, data } = paraPainel(leadDeTeste({ slug: "b", instagram: "@barbeariab" }), "2026-10-09T19:00:00.000Z");
  assert.equal(id, "b");
  assert.equal(data.slug, "b");
  assert.equal(data.status, "novo");
  assert.deepEqual(data.historico, [{ status: "novo", em: "2026-10-09T19:00:00.000Z" }]);
  assert.equal(data.instagramUrl, "https://www.instagram.com/barbeariab/");
  assert.equal(data.previaUrl, null);
  assert.equal(data.notas, "");
  assert.equal(data.plano, null);
  assert.equal(data.precoMensal, null);
  assert.equal(data.motivoPerda, null);
  assert.equal(data.limpo, false);
});

test("sem Instagram, sem link", () => {
  assert.equal(paraPainel(leadDeTeste({ instagram: null }), "t").data.instagramUrl, null);
});

test("exporta todo lead já escolhido para o painel, não só o último lote", () => {
  const docs = documentosDoPainel(
    [
      leadDeTeste({ slug: "candidato", fase: "candidato" }),
      leadDeTeste({ slug: "lote-anterior", fase: "lote", lote: "2026-10-08" }),
      leadDeTeste({ slug: "detalhado", fase: "detalhado", lote: "2026-10-08" }),
      leadDeTeste({ slug: "lote-hoje", fase: "lote", lote: "2026-10-09" }),
    ],
  );
  assert.deepEqual(docs.map((d) => d.id), ["lote-anterior", "detalhado", "lote-hoje"]);
});

test("documento do painel é datado pelo dia do lote, não pela hora do build", () => {
  // Senão um lead "novo" parecia recém-mexido a cada build e nunca chegava aos 14 dias do limpar.
  const [doc] = documentosDoPainel([leadDeTeste({ slug: "a", fase: "lote", lote: "2026-10-08" })]);
  assert.equal(doc.data.criadoEm, "2026-10-08T15:00:00.000Z");
  assert.equal(doc.data.atualizadoEm, "2026-10-08T15:00:00.000Z");
  assert.deepEqual(doc.data.historico, [{ status: "novo", em: "2026-10-08T15:00:00.000Z" }]);
});
