import { test } from "node:test";
import assert from "node:assert/strict";
import { LAYOUTS, layoutPorId, layoutsDoNicho } from "./layouts.ts";
import { problemasDoTema } from "./tema.ts";

const TEMA = { fundo: "#ffffff", superficie: "#f3f3f1", texto: "#141414", destaque: "#1f4d3a", fontes: "grotesk-inter" };

test("tema com pouco contraste aponta o par e o valor", () => {
  const p = problemasDoTema({ ...TEMA, texto: "#cccccc" });
  assert.ok(p.includes("contraste texto × fundo é 1.61:1, abaixo de 4.5:1"), p.join(" | "));
});

test("cor que não é #rrggbb e fontes desconhecidas são apontadas", () => {
  const p = problemasDoTema({ ...TEMA, destaque: "verde", fontes: "comic" });
  assert.ok(p.some((x) => x.startsWith("tema.destaque")));
  assert.ok(p.some((x) => x.startsWith("tema.fontes desconhecido: comic")));
});

test("destaque precisa se destacar do fundo (3:1)", () => {
  assert.ok(problemasDoTema({ ...TEMA, destaque: "#eeeeee" }).some((x) => x.startsWith("contraste destaque × fundo")));
});

test("todo layout tem tema padrão sem problemas, e cada nicho tem 3 layouts", () => {
  for (const l of LAYOUTS) assert.deepEqual(problemasDoTema(l.temaPadrao), [], l.id);
  assert.deepEqual(layoutsDoNicho("barbearia").map((l) => l.id), ["classica", "moderna-escura", "minimal"]);
  assert.deepEqual(layoutsDoNicho("estetica").map((l) => l.id), ["suave", "luxo", "clean"]);
  assert.equal(layoutPorId("luxo").variantes.inicio, "cheia");
  assert.throws(() => layoutPorId("x"), /Layout desconhecido: x/);
});
