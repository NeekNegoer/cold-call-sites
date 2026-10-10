import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { criarArmazem } from "../../../prospeccao/armazem.ts";
import { leadDeTeste } from "../../../prospeccao/fixtures/lead.ts";
import { criarFicha, sortearSufixo } from "./criar.ts";
import { validarFicha } from "./validar.ts";

const pastaFotos = "sites/public/fotos/barbearia-x";

function raizComLead() {
  const raiz = mkdtempSync(join(tmpdir(), "ficha-"));
  const armazem = criarArmazem(raiz);
  armazem.salvarLead(leadDeTeste({
    slug: "barbearia-x",
    fase: "detalhado",
    detalhes: {
      horarios: [{ dia: "segunda-feira", horas: "09:00 to 18:00" }],
      coordenadas: null,
      reviews: [{ autor: "Ana Lima", texto: "Muito bom.", nota: 5 }],
      fotos: [`${pastaFotos}/1.jpg`, `${pastaFotos}/2.jpg`, `${pastaFotos}/3.jpg`],
      detalhadoEm: "2026-10-10T12:00:00.000Z",
    },
  }));
  armazem.salvarLead(leadDeTeste({ slug: "barbearia-y", fase: "lote" }));
  mkdirSync(join(raiz, pastaFotos), { recursive: true });
  writeFileSync(join(raiz, pastaFotos, "1.jpg"), "foto1");
  writeFileSync(join(raiz, pastaFotos, "2.jpg"), "foto2");
  return raiz;
}

test("cria o rascunho, copia as fotos que existem e avisa da que falta", () => {
  const raiz = raizComLead();
  const r = criarFicha({ raiz, slug: "barbearia-x", sortear: () => "k7q2" });
  assert.equal(r.arquivo, join(raiz, "sites", "src", "fichas", "barbearia-x.json"));
  assert.deepEqual(JSON.parse(readFileSync(r.arquivo, "utf8")), r.ficha);
  assert.equal(r.ficha.sufixo, "k7q2");
  assert.deepEqual(r.ficha.fotos.map((f) => f.arquivo), ["1.jpg", "2.jpg"]);
  assert.equal(readFileSync(join(raiz, "sites", "src", "fotos", "barbearia-x", "2.jpg"), "utf8"), "foto2");
  assert.ok(r.pendencias.includes(`Foto não encontrada: ${pastaFotos}/3.jpg`));
  assert.doesNotThrow(() => validarFicha(r.ficha, "x"));
});

test("recusa lead inexistente, lead não detalhado e ficha que já existe, sem sobrescrever", () => {
  const raiz = raizComLead();
  assert.throws(() => criarFicha({ raiz, slug: "nada" }), /Lead não encontrado: nada/);
  assert.throws(() => criarFicha({ raiz, slug: "barbearia-y" }), /npm run detalhar -- barbearia-y/);
  const { arquivo } = criarFicha({ raiz, slug: "barbearia-x" });
  writeFileSync(arquivo, '{"editado": true}');
  assert.throws(() => criarFicha({ raiz, slug: "barbearia-x" }), /Já existe sites\/src\/fichas\/barbearia-x\.json/);
  assert.equal(readFileSync(arquivo, "utf8"), '{"editado": true}');
  assert.ok(!existsSync(join(raiz, "sites", "src", "fichas", "barbearia-y.json")));
});

test("o sufixo sorteado tem 4 letras minúsculas ou números", () => {
  for (let i = 0; i < 100; i++) assert.match(sortearSufixo(), /^[a-z0-9]{4}$/);
});
