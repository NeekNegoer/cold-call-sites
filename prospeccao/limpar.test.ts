import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { criarArmazem } from "./armazem.ts";
import { executarLimpeza, selecionarParaLimpar, PATCH_LIMPEZA } from "./limpar.ts";
import { leadDeTeste } from "./fixtures/lead.ts";

const AGORA = new Date("2026-10-30T12:00:00Z");
const antigo = "2026-10-10T12:00:00Z";
const recente = "2026-10-25T12:00:00Z";

test("aplica a regra de 14 dias", () => {
  const leads = [
    leadDeTeste({ slug: "perdido", fase: "lote" }),
    leadDeTeste({ slug: "novo-parado", fase: "lote" }),
    leadDeTeste({ slug: "sem-resposta-recente", fase: "lote" }),
    leadDeTeste({ slug: "interessado-parado", fase: "lote" }),
    leadDeTeste({ slug: "candidato-velho", fase: "candidato", buscadoEm: antigo }),
    leadDeTeste({ slug: "candidato-novo", fase: "candidato", buscadoEm: recente }),
  ];
  const status = [
    { id: "perdido", status: "perdeu", atualizadoEm: recente },
    { id: "novo-parado", status: "novo", atualizadoEm: antigo },
    { id: "sem-resposta-recente", status: "sem_resposta", atualizadoEm: recente },
    { id: "interessado-parado", status: "interessado", atualizadoEm: antigo },
  ];
  assert.deepEqual(selecionarParaLimpar(leads, status, AGORA), ["perdido", "novo-parado", "candidato-velho"]);
});

test("o patch apaga dados coletados e mantém o trabalho de quem liga", () => {
  assert.equal(PATCH_LIMPEZA.limpo, true);
  assert.equal(PATCH_LIMPEZA.telefone, null);
  assert.equal(PATCH_LIMPEZA.nome, null);
  for (const campo of ["slug", "placeId", "status", "notas", "historico", "plano", "precoMensal", "motivoPerda", "nicho", "cidade", "score"]) {
    assert.equal(campo in PATCH_LIMPEZA, false, campo);
  }
});

function armazemComLeads() {
  const armazem = criarArmazem(mkdtempSync(join(tmpdir(), "cold-")));
  armazem.salvarLead(leadDeTeste({ slug: "perdido", fase: "lote" }));
  armazem.salvarLead(leadDeTeste({ slug: "interessado", fase: "lote" }));
  return armazem;
}

test("exportação velha ou no formato antigo é recusada e nada é apagado", () => {
  for (const exportacao of [
    [{ id: "perdido", status: "perdeu", atualizadoEm: recente }],
    { exportadoEm: "2026-10-30T10:00:00Z", status: [{ id: "perdido", status: "perdeu", atualizadoEm: recente }] },
  ]) {
    const armazem = armazemComLeads();
    armazem.gravarSistema("painel-status.json", exportacao);
    assert.throws(() => executarLimpeza({ armazem, agora: AGORA, apagarFotos: () => {} }), /exportar/);
    assert.equal(armazem.listarLeads().length, 2);
  }
});

test("exportação recente apaga, gera os patches a partir do painel e é consumida", () => {
  const armazem = armazemComLeads();
  armazem.gravarSistema("painel-status.json", {
    exportadoEm: "2026-10-30T11:30:00Z",
    status: [
      { id: "perdido", status: "perdeu", atualizadoEm: recente },
      { id: "interessado", status: "interessado", atualizadoEm: antigo },
      { id: "apagado-antes", status: "perdeu", atualizadoEm: antigo },
      { id: "ja-limpo", status: "perdeu", atualizadoEm: antigo, limpo: true },
    ],
  });
  const fotosApagadas: string[] = [];
  const r = executarLimpeza({ armazem, agora: AGORA, apagarFotos: (slug) => fotosApagadas.push(slug) });
  assert.deepEqual(r.apagados, ["perdido"]);
  assert.deepEqual(fotosApagadas, ["perdido"]);
  assert.deepEqual(armazem.listarLeads().map((l) => l.slug), ["interessado"]);
  assert.deepEqual(r.paraPainel.map((p) => p.id), ["perdido", "apagado-antes"]);
  assert.deepEqual(armazem.lerSistema("painel-limpar.json", []), r.paraPainel);
  assert.equal(armazem.lerSistema("painel-status.json", null), null);
});
