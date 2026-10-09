import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const raiz = fileURLToPath(new URL("../", import.meta.url));

test("gera caderno.html com a lógica embutida e script válido", () => {
  const build = spawnSync(process.execPath, ["painel/construir.ts"], { cwd: raiz, encoding: "utf8" });
  assert.equal(build.status, 0, build.stderr);
  const html = readFileSync(join(raiz, "painel/dist/caderno.html"), "utf8");
  assert.ok(html.startsWith("<title>Caderno de Ligações</title>"));
  assert.ok(!html.includes("/*__LOGICA__*/"));
  assert.ok(html.includes("export function mudarStatus"));
  const script = html.split('<script type="module">')[1]?.split("</script>")[0];
  assert.ok(script, "script module não encontrado");
  const arquivo = join(mkdtempSync(join(tmpdir(), "caderno-")), "pagina.mjs");
  writeFileSync(arquivo, script);
  const checagem = spawnSync(process.execPath, ["--check", arquivo], { encoding: "utf8" });
  assert.equal(checagem.status, 0, checagem.stderr);
});
