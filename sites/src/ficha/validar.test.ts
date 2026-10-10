import { test } from "node:test";
import assert from "node:assert/strict";
import { fichaValida } from "./fixtures.ts";
import type { Intervalo } from "./tipos.ts";
import { validarFicha } from "./validar.ts";

test("ficha válida passa e volta igual", () => {
  const f = fichaValida();
  assert.equal(validarFicha(f, "x.json"), f);
});

test("junta todos os erros numa mensagem com o nome do arquivo", () => {
  const ruim = { ...fichaValida(), slug: "Com Espaço", tema: { ...fichaValida().tema, texto: "#cccccc", fundo: "#ffffff" } };
  assert.throws(
    () => validarFicha(ruim, "x.json"),
    (e: Error) => /^Ficha inválida \(x\.json\):/.test(e.message) && /\n- slug/.test(e.message) && /contraste texto × fundo/.test(e.message),
  );
});

test("preço é proibido numa prévia", () => {
  assert.throws(() => validarFicha(fichaValida({ servicos: [{ nome: "Corte", duracaoMin: 30, preco: 40 }] }), "x"), /prévia nunca inventa preço/);
});

test("layout precisa ser do nicho", () => {
  assert.throws(() => validarFicha(fichaValida({ nicho: "estetica" }), "x"), /layout precisa ser um de: suave, luxo, clean/);
});

test("dia pendente (null) só passa no rascunho", () => {
  const contato = { ...fichaValida().contato, horarios: { ...fichaValida().contato.horarios, qua: null } };
  assert.doesNotThrow(() => validarFicha(fichaValida({ rascunho: true, contato }), "x"));
  assert.throws(() => validarFicha(fichaValida({ contato }), "x"), /contato\.horarios\.qua está pendente/);
});

test("modo final ainda não existe", () => {
  assert.throws(() => validarFicha(fichaValida({ modo: "final" }), "x"), /modo final ainda não existe/);
});

test("intervalos sobrepostos são recusados", () => {
  const seg: Intervalo[] = [["09:00", "13:00"], ["12:00", "18:00"]];
  const contato = { ...fichaValida().contato, horarios: { ...fichaValida().contato.horarios, seg } };
  assert.throws(() => validarFicha(fichaValida({ contato }), "x"), /contato\.horarios\.seg tem intervalo inválido/);
});

test("fora do rascunho precisa de pelo menos um dia aberto", () => {
  const fechado = { seg: [], ter: [], qua: [], qui: [], sex: [], sab: [], dom: [] };
  assert.throws(() => validarFicha(fichaValida({ contato: { ...fichaValida().contato, horarios: fechado } }), "x"), /pelo menos um dia aberto/);
});

test("algo que não é objeto é recusado", () => {
  assert.throws(() => validarFicha([], "x"), /a ficha precisa ser um objeto JSON/);
});
