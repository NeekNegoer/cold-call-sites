import { before, test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { construirSites } from "./src/construir.ts";
import { LAYOUTS } from "./src/tema/layouts.ts";

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

// Task 9: páginas da prévia.
const pagina = (caminho: string) => readFileSync(join(saida, caminho, "index.html"), "utf8");
const arquivos = (ext: string) =>
  readdirSync(saida, { recursive: true, encoding: "utf8" }).filter((f) => f.endsWith(ext)).map((f) => join(saida, f));
const EXEMPLOS = { barbearia: ["exemplo-barbearia", "exemplo-pior-barbearia"], estetica: ["exemplo-estetica", "exemplo-pior-estetica"] };

test("as 12 páginas de exemplo e as 12 de privacidade existem", () => {
  for (const l of LAYOUTS) {
    for (const e of EXEMPLOS[l.nicho]) {
      assert.ok(existsSync(join(saida, `${e}-${l.id}`, "index.html")), `${e}-${l.id}`);
      assert.ok(existsSync(join(saida, `${e}-${l.id}`, "privacidade", "index.html")), `${e}-${l.id}/privacidade`);
    }
  }
});

for (const l of LAYOUTS) {
  test(`exemplo-${l.nicho}-${l.id}: layout, variantes, seções, faixa e crédito das fotos`, () => {
    const html = pagina(`exemplo-${l.nicho}-${l.id}`);
    assert.match(html, new RegExp(`data-layout="${l.id}"`));
    for (const [secao, v] of Object.entries(l.variantes)) assert.ok(html.includes(`${secao}--${v}`), `${secao}--${v}`);
    for (const id of ["servicos", "equipe", "depoimentos", "galeria", "localizacao"]) assert.ok(html.includes(`id="${id}"`), id);
    assert.equal(html.match(/<h1\b/g)?.length, 1);
    assert.match(html, /<html lang="pt-BR"/);
    assert.ok(html.includes("Prévia criada para"));
    assert.ok(html.includes("Fotos: Google Maps"));
    assert.ok(!html.includes("RASCUNHO"));
  });
}

test("pior caso de barbearia: some o que não existe e o nome sai escapado", () => {
  for (const l of LAYOUTS.filter((x) => x.nicho === "barbearia")) {
    const html = pagina(`exemplo-pior-barbearia-${l.id}`);
    for (const ausente of ['id="galeria"', 'id="equipe"', 'class="horarios"', "<img"]) assert.ok(!html.includes(ausente), `${l.id}: ${ausente}`);
    assert.ok(html.includes('id="depoimentos"') && html.includes('id="localizacao"'), l.id);
    assert.ok(html.includes("&lt;Desde 1987&gt;") && !html.includes("<Desde 1987>"), l.id);
  }
});

test("nada de recurso de terceiros: scripts, estilos, fontes e imagens saem de /previas/", () => {
  for (const arquivo of arquivos(".html")) {
    const html = readFileSync(arquivo, "utf8");
    for (const tag of html.match(/<(?:script|link|img|source|iframe)\b[^>]*>/g) ?? []) {
      for (const [, valor] of tag.matchAll(/\b(?:src|href|srcset)="([^"]*)"/g)) {
        for (const url of valor.split(",").map((s) => s.trim().split(/\s+/)[0]).filter(Boolean)) {
          assert.ok(url.startsWith("/previas/") || url.startsWith("data:"), `${arquivo}: ${tag}`);
        }
      }
    }
    assert.doesNotMatch(html, /url\(\s*["']?(?:https?:)?\/\//, arquivo);
  }
  for (const arquivo of arquivos(".css")) assert.doesNotMatch(readFileSync(arquivo, "utf8"), /url\(\s*["']?(?:https?:)?\/\/|@import/, arquivo);
});

test("nenhuma página ou script toca nas chaves do caderno, e toda imagem tem alt", () => {
  for (const arquivo of [...arquivos(".html"), ...arquivos(".js")]) assert.ok(!readFileSync(arquivo, "utf8").includes("caderno:"), arquivo);
  for (const arquivo of arquivos(".html")) {
    for (const img of readFileSync(arquivo, "utf8").match(/<img\b[^>]*>/g) ?? []) assert.match(img, /\balt="[^"]+"/, `${arquivo}: ${img}`);
  }
});

// Task 10: gaveta de agendamento.
const decodificar = (s: string) =>
  s.replace(/&(?:quot|amp|lt|gt|#39|#(\d+));/g, (m, n?: string) =>
    n ? String.fromCharCode(Number(n)) : ({ "&quot;": '"', "&amp;": "&", "&lt;": "<", "&gt;": ">", "&#39;": "'" } as Record<string, string>)[m]);

test("a gaveta de agendamento vem com os dados da ficha, o aviso de demonstração e os botões de agendar", () => {
  const html = pagina("exemplo-barbearia-classica");
  assert.ok(html.includes('<dialog class="agenda"'));
  const bruto = /data-agenda="([^"]*)"/.exec(html)?.[1];
  assert.ok(bruto, "data-agenda ausente");
  const dados = JSON.parse(decodificar(bruto));
  assert.equal(dados.slug, "exemplo-barbearia");
  assert.deepEqual(dados.servicos.map((s: { nome: string }) => s.nome), ["Corte", "Barba", "Corte + barba", "Sobrancelha"]);
  assert.deepEqual(dados.profissionais, ["Rafael", "Diego"]);
  assert.ok(html.includes("Agendamento de demonstração: nada foi marcado de verdade."));
  assert.ok((html.match(/data-agendar/g) ?? []).length >= 3);
});

// Tasks 11 e 12: CSS dos layouts e das variantes.
test("o CSS de cada layout e de cada variante foi para o build", () => {
  const css = arquivos(".css").map((f) => readFileSync(f, "utf8")).join("\n");
  for (const l of LAYOUTS.filter((x) => x.nicho === "barbearia")) assert.match(css, new RegExp(`\\[data-layout="?${l.id}"?\\]`), l.id);
  for (const classe of ["inicio--moldura", "inicio--cheia", "inicio--dividida", "servicos--cartoes", "depoimentos--cartoes", "galeria--faixa", "galeria--mosaico"]) {
    assert.ok(css.includes(`.${classe}`), classe);
  }
});
