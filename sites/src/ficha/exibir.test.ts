import { test } from "node:test";
import assert from "node:assert/strict";
import { formatarIntervalos, linhasDeHorario, linkInstagram, linkTelefone, rotuloDuracao, telefoneLegivel } from "./exibir.ts";
import { fichaValida } from "./fixtures.ts";

test("horário do dia em texto", () => {
  assert.equal(formatarIntervalos(null), "A confirmar");
  assert.equal(formatarIntervalos([]), "Fechado");
  assert.equal(formatarIntervalos([["00:00", "24:00"]]), "24 horas");
  assert.equal(formatarIntervalos([["09:00", "12:00"], ["13:45", "19:00"]]), "09:00 – 12:00 · 13:45 – 19:00");
});

test("linhas de horário de segunda a domingo", () => {
  const l = linhasDeHorario(fichaValida().contato.horarios);
  assert.deepEqual(l[0], { dia: "seg", nome: "Segunda", texto: "09:00 – 19:00" });
  assert.deepEqual(l[6], { dia: "dom", nome: "Domingo", texto: "Fechado" });
});

test("duração legível", () => {
  assert.deepEqual([15, 30, 60, 90, 120].map(rotuloDuracao), ["15 min", "30 min", "1 h", "1 h 30", "2 h"]);
});

test("telefone legível e links de telefone e Instagram", () => {
  assert.equal(telefoneLegivel("+55 48 99999-0001"), "(48) 99999-0001");
  assert.equal(telefoneLegivel("+55 48 3000-0000"), "(48) 3000-0000");
  assert.equal(telefoneLegivel("0800 123 4567"), "0800 123 4567");
  assert.equal(linkTelefone("+55 48 99999-0001"), "tel:+5548999990001");
  assert.equal(linkInstagram("@fio.navalha"), "https://www.instagram.com/fio.navalha/");
});
