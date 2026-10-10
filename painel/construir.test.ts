import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { criarArmazem } from "../prospeccao/armazem.ts";
import { leadDeTeste } from "../prospeccao/fixtures/lead.ts";
import { construirPainel } from "./construir.ts";
import { descriptografar } from "./cripto.js";

const SENHA = "uma senha de teste bem comprida";

function raizComLeads() {
  const raiz = mkdtempSync(join(tmpdir(), "cold-"));
  const armazem = criarArmazem(raiz);
  armazem.salvarLead(leadDeTeste({ slug: "no-lote", nome: "Barbearia Segredo", telefone: "+55 48 98888-1234", fase: "lote", lote: "2026-10-09" }));
  armazem.salvarLead(leadDeTeste({ slug: "candidato", fase: "candidato" }));
  return raiz;
}

test("gera a página com os leads só dentro do cofre, script válido, e abre com a senha", async () => {
  const { html, leads } = await construirPainel({ raiz: raizComLeads(), senha: SENHA, agora: new Date("2026-10-10T12:00:00Z"), iteracoes: 1000 });
  assert.equal(leads, 1);
  assert.ok(html.startsWith("<!doctype html>"));
  assert.ok(html.includes('<meta name="viewport" content="width=device-width, initial-scale=1">'));
  assert.ok(html.includes("<title>Caderno de Ligações</title>"));
  assert.ok(!html.includes("/*__LOGICA__*/") && !html.includes("__COFRE__"));
  assert.ok(!html.includes("Segredo") && !html.includes("98888"));
  assert.ok(html.includes('<meta name="robots" content="noindex, nofollow">'));

  const script = html.split('<script type="module">')[1]?.split("</script>")[0];
  assert.ok(script, "script module não encontrado");
  const arquivo = join(mkdtempSync(join(tmpdir(), "caderno-")), "pagina.mjs");
  writeFileSync(arquivo, script);
  const checagem = spawnSync(process.execPath, ["--check", arquivo], { encoding: "utf8" });
  assert.equal(checagem.status, 0, checagem.stderr);

  const cofre = JSON.parse(html.split('<script type="application/json" id="cofre">')[1].split("</script>")[0]);
  const aberto = JSON.parse((await descriptografar(cofre, SENHA)) ?? "null");
  assert.equal(aberto.geradoEm, "2026-10-10T12:00:00.000Z");
  assert.deepEqual(aberto.leads.map((l: { slug: string }) => l.slug), ["no-lote"]);
  assert.equal(aberto.leads[0].telefone, "+55 48 98888-1234");
});

test("sem senha, ou com senha curta, não gera nada", async () => {
  for (const senha of [undefined, "", "curta"]) {
    await assert.rejects(construirPainel({ raiz: raizComLeads(), senha, agora: new Date(), iteracoes: 1000 }), /PAINEL_SENHA/);
  }
});
