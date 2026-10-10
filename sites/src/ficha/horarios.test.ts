import { test } from "node:test";
import assert from "node:assert/strict";
import { converterHorarios } from "./horarios.ts";

test("converte a semana do Google, com almoço, 24 horas, dia fechado e hora sem zero", () => {
  const r = converterHorarios([
    { dia: "segunda-feira", horas: "09:00 to 20:00" },
    { dia: "terça-feira", horas: "09:00 to 20:00" },
    { dia: "quarta-feira", horas: "09:00 to 12:00, 13:45 to 19:00" },
    { dia: "quinta-feira", horas: "9:00 to 18:00" },
    { dia: "sexta-feira", horas: "Open 24 hours" },
    { dia: "sábado", horas: "09:00 to 17:00" },
    { dia: "domingo", horas: "Fechado" },
  ]);
  assert.deepEqual(r, {
    horarios: {
      seg: [["09:00", "20:00"]],
      ter: [["09:00", "20:00"]],
      qua: [["09:00", "12:00"], ["13:45", "19:00"]],
      qui: [["09:00", "18:00"]],
      sex: [["00:00", "24:00"]],
      sab: [["09:00", "17:00"]],
      dom: [],
    },
    pendentes: [],
  });
});

test("horário que vira a noite, texto livre ou dia ausente fica pendente (null)", () => {
  const r = converterHorarios([
    { dia: "segunda-feira", horas: "18:00 to 02:00" },
    { dia: "terça-feira", horas: "Horário variável" },
    { dia: "quarta-feira", horas: "20:00 to 00:00" },
  ]);
  assert.equal(r?.horarios.seg, null);
  assert.equal(r?.horarios.ter, null);
  assert.deepEqual(r?.horarios.qua, [["20:00", "24:00"]]);
  assert.equal(r?.horarios.qui, null);
  assert.deepEqual(r?.pendentes, [
    'seg: horário não reconhecido ("18:00 to 02:00")',
    'ter: horário não reconhecido ("Horário variável")',
    "qui: sem horário no Google",
    "sex: sem horário no Google",
    "sab: sem horário no Google",
    "dom: sem horário no Google",
  ]);
});

test("intervalos que se sobrepõem ficam pendentes", () => {
  const r = converterHorarios([{ dia: "segunda-feira", horas: "09:00 to 13:00, 12:00 to 18:00" }]);
  assert.equal(r?.horarios.seg, null);
});

test("sem nenhum horário no Google, devolve null", () => {
  assert.equal(converterHorarios([]), null);
});
