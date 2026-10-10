import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { baixarFotos, urlEmAltaResolucao } from "./fotos.ts";

test("pede a foto do Google com 1200px de largura", () => {
  assert.equal(urlEmAltaResolucao("https://lh3.googleusercontent.com/p/abc=w408-h306-k-no"), "https://lh3.googleusercontent.com/p/abc=w1200");
  assert.equal(urlEmAltaResolucao("https://lh3.googleusercontent.com/p/abc"), "https://lh3.googleusercontent.com/p/abc=w1200");
  assert.equal(urlEmAltaResolucao("https://exemplo.com/foto.jpg"), "https://exemplo.com/foto.jpg");
});

test("salva só respostas de imagem e segue quando uma falha", async () => {
  const raiz = mkdtempSync(join(tmpdir(), "cold-"));
  const f = (async (url: string | URL | Request) => {
    const u = String(url);
    if (u.includes("boa")) return new Response(new Uint8Array([1, 2, 3]), { headers: { "content-type": "image/jpeg" } });
    if (u.includes("html")) return new Response("<html>", { headers: { "content-type": "text/html" } });
    throw new Error("rede");
  }) as typeof fetch;
  const salvos = await baixarFotos(["https://x/boa", "https://x/html", "https://x/erro"], "sites/public/fotos/barbearia-x", raiz, f);
  assert.deepEqual(salvos, ["sites/public/fotos/barbearia-x/1.jpg"]);
  assert.ok(existsSync(join(raiz, "sites/public/fotos/barbearia-x/1.jpg")));
});
