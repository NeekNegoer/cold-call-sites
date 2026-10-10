import { test } from "node:test";
import assert from "node:assert/strict";
import type { Horarios } from "../ficha/tipos.ts";
import { agoraEmSaoPaulo, diaDaSemana, horariosLivres, inicioPermitido, proximosDias, unirHorarios } from "./horarios.ts";

const MANHA: [string, string][] = [["09:00", "12:00"]];

test("horários livres em passos de 30 min, com o serviço cabendo inteiro", () => {
  assert.deepEqual(horariosLivres({ funcionamento: MANHA, ocupados: [], duracaoMin: 30 }), ["09:00", "09:30", "10:00", "10:30", "11:00", "11:30"]);
  assert.deepEqual(horariosLivres({ funcionamento: MANHA, ocupados: [], duracaoMin: 60 }), ["09:00", "09:30", "10:00", "10:30", "11:00"]);
});

test("um horário ocupado bloqueia quem encostaria nele", () => {
  const ocupados: [string, string][] = [["10:00", "10:30"]];
  assert.deepEqual(horariosLivres({ funcionamento: MANHA, ocupados, duracaoMin: 30 }), ["09:00", "09:30", "10:30", "11:00", "11:30"]);
  assert.deepEqual(horariosLivres({ funcionamento: MANHA, ocupados, duracaoMin: 60 }), ["09:00", "10:30", "11:00"]);
});

test("intervalo de almoço, mínimo de antecedência, dia fechado, serviço longo e 24 horas", () => {
  const almoco: [string, string][] = [["09:00", "12:00"], ["13:45", "15:00"]];
  assert.deepEqual(horariosLivres({ funcionamento: almoco, ocupados: [], duracaoMin: 30 }).slice(-2), ["13:45", "14:15"]);
  assert.deepEqual(horariosLivres({ funcionamento: MANHA, ocupados: [], duracaoMin: 30, minutoMinimo: 610 }), ["10:30", "11:00", "11:30"]);
  assert.deepEqual(horariosLivres({ funcionamento: [], ocupados: [], duracaoMin: 30 }), []);
  assert.deepEqual(horariosLivres({ funcionamento: MANHA, ocupados: [], duracaoMin: 240 }), []);
  const dia = horariosLivres({ funcionamento: [["00:00", "24:00"]], ocupados: [], duracaoMin: 30 });
  assert.equal(dia.length, 48);
  assert.equal(dia.at(-1), "23:30");
});

test("'sem preferência' une os horários sem repetir", () => {
  assert.deepEqual(unirHorarios([["09:30", "10:00"], ["09:00", "10:00"]]), ["09:00", "09:30", "10:00"]);
});

test("agora em São Paulo, dia da semana e próximos 14 dias", () => {
  assert.deepEqual(agoraEmSaoPaulo(new Date("2026-10-10T02:30:00Z")), { data: "2026-10-09", minutos: 1410 });
  assert.equal(diaDaSemana("2026-10-10"), "sab");
  const semana: Horarios = { seg: [["09:00", "19:00"]], ter: [["09:00", "19:00"]], qua: [["09:00", "19:00"]], qui: [["09:00", "19:00"]], sex: [["09:00", "19:00"]], sab: [["09:00", "17:00"]], dom: [] };
  const dias = proximosDias(semana, "2026-10-10");
  assert.equal(dias.length, 14);
  assert.deepEqual(dias[0], { data: "2026-10-10", dia: "sab", aberto: true });
  assert.deepEqual(dias[1], { data: "2026-10-11", dia: "dom", aberto: false });
  assert.equal(dias[13].data, "2026-10-23");
  assert.equal(proximosDias({ ...semana, sab: null }, "2026-10-10")[0].aberto, false);
});

test("antecedência: hoje começa 60 min depois de agora, amanhã livre, ontem fechado", () => {
  const agora = new Date("2026-10-12T12:00:00Z"); // segunda, 09:00 em São Paulo
  assert.equal(inicioPermitido("2026-10-12", agora), 600);
  assert.equal(inicioPermitido("2026-10-13", agora), 0);
  assert.equal(inicioPermitido("2026-10-11", agora), null);
});
