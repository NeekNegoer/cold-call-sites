import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { criarArmazem } from "./armazem.ts";
import { leadDeTeste } from "./fixtures/lead.ts";

test("salva, lista e remove leads; ignora a pasta _sistema", () => {
  const a = criarArmazem(mkdtempSync(join(tmpdir(), "cold-")));
  a.salvarLead(leadDeTeste());
  a.salvarVistos(new Set(["b", "a"]));
  assert.deepEqual(a.listarLeads().map((l) => l.slug), ["barbearia-x"]);
  a.removerLead("barbearia-x");
  assert.deepEqual(a.listarLeads(), []);
});

test("vistos e uso persistem", () => {
  const a = criarArmazem(mkdtempSync(join(tmpdir(), "cold-")));
  assert.deepEqual([...a.lerVistos()], []);
  a.salvarVistos(new Set(["b", "a"]));
  assert.deepEqual([...a.lerVistos()], ["a", "b"]);
  a.registrarUso({ quando: "t1", comando: "buscar", runId: "r1", gastoEstimadoUsd: 0.2, lugares: 40 });
  a.registrarUso({ quando: "t2", comando: "buscar", runId: "r2", gastoEstimadoUsd: 0.1, lugares: 20 });
  assert.deepEqual(a.lerUso().map((u) => u.runId), ["r1", "r2"]);
});
