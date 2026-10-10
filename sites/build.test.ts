import { before, test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { construirSites } from "./src/construir.ts";

// Um build só, no modo "exemplos" (só fichas fictícias), compartilhado por todos os testes deste arquivo.
const raiz = fileURLToPath(new URL("../", import.meta.url));
const saida = mkdtempSync(join(tmpdir(), "previas-"));
before(() => construirSites({ raiz, saida, modo: "exemplos" }));

test("a raiz sai vazia, com noindex e no-referrer, e sem as fotos do Plano A", () => {
  const html = readFileSync(join(saida, "index.html"), "utf8");
  assert.match(html, /<meta name="robots" content="noindex, nofollow"\s*\/?>/);
  assert.match(html, /<meta name="referrer" content="no-referrer"\s*\/?>/);
  assert.doesNotMatch(html, /<a\s/);
  assert.ok(!existsSync(join(saida, "fotos")));
});
