import { test } from "node:test";
import assert from "node:assert/strict";
import { selecionarParaLimpar, PATCH_LIMPEZA } from "./limpar.ts";
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
