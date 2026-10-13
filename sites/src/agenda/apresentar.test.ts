import { test } from "node:test";
import assert from "node:assert/strict";
import { fichaValida } from "../ficha/fixtures.ts";
import { dadosDaAgenda, resumoDoAgendamento, rotuloDia } from "./apresentar.ts";

test("rótulo do dia: hoje, amanhã ou dia da semana com data", () => {
  assert.equal(rotuloDia("2026-10-10", "2026-10-10"), "Hoje");
  assert.equal(rotuloDia("2026-10-11", "2026-10-10"), "Amanhã");
  assert.equal(rotuloDia("2026-10-17", "2026-10-10"), "sáb, 17/10");
  assert.equal(rotuloDia("2026-10-13", "2026-10-10"), "ter, 13/10");
});

test("resumo do agendamento, com e sem profissional", () => {
  assert.equal(
    resumoDoAgendamento({ servico: "Corte", data: "2026-10-11", hora: "09:30", profissional: "Rafael", hoje: "2026-10-10" }),
    "Corte · amanhã às 09:30 com Rafael",
  );
  assert.equal(
    resumoDoAgendamento({ servico: "Barba", data: "2026-10-13", hora: "14:00", profissional: null, hoje: "2026-10-10" }),
    "Barba · ter, 13/10 às 14:00",
  );
});

test("dados da agenda saem da ficha, sem preço nem dados extras", () => {
  const ficha = fichaValida({ profissionais: [{ nome: "Ana", foto: "1.jpg" }] });
  assert.deepEqual(dadosDaAgenda(ficha), {
    slug: "barbearia-teste",
    servicos: [{ nome: "Corte", duracaoMin: 30 }],
    profissionais: ["Ana"],
    horarios: ficha.contato.horarios,
    whatsapp: "https://wa.me/5548900000000",
    telefone: "+55 48 90000-0000",
  });
});
