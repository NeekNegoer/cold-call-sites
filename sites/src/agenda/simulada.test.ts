import { test } from "node:test";
import assert from "node:assert/strict";
import { deMinutos } from "./horarios.ts";
import { armazenamentoSeguro, chaveDaPrevia, criarFonteSimulada, ocupadoFicticio, type Armazenamento } from "./simulada.ts";
import type { DadosAgenda, PedidoAgendamento } from "./tipos.ts";

const AGORA = new Date("2026-10-12T12:00:00Z"); // segunda, 09:00 em São Paulo
const TERCA = "2026-10-13";
const DADOS: DadosAgenda = {
  slug: "exemplo-teste",
  servicos: [{ nome: "Corte", duracaoMin: 30 }, { nome: "Corte + barba", duracaoMin: 60 }],
  profissionais: ["Ana", "Bruno"],
  horarios: {
    seg: [["09:00", "19:00"]], ter: [["09:00", "19:00"]], qua: [["09:00", "19:00"]], qui: [["09:00", "19:00"]],
    sex: [["09:00", "19:00"]], sab: [["09:00", "17:00"]], dom: [],
  },
  whatsapp: null,
  telefone: null,
};

function memoria() {
  const m = new Map<string, string>();
  const armazenamento: Armazenamento = { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => void m.set(k, v) };
  return { m, armazenamento };
}
const fonte = (dados = DADOS, armazenamento = memoria().armazenamento) => criarFonteSimulada({ dados, armazenamento, agora: () => AGORA });
const pedido = (p: Partial<PedidoAgendamento> = {}): PedidoAgendamento => ({
  servico: "Corte", profissional: "Ana", data: TERCA, hora: "09:00", nome: "Maria Souza", celular: "(48) 99876-5432", isca: "", ...p,
});

test("a ocupação fictícia é sempre a mesma e fica perto de 30%", () => {
  assert.equal(ocupadoFicticio("a", TERCA, "Ana", "09:00"), ocupadoFicticio("a", TERCA, "Ana", "09:00"));
  let ocupados = 0;
  let total = 0;
  for (let d = 13; d <= 25; d++) {
    for (const p of ["Ana", "Bruno", null]) {
      for (let m = 9 * 60; m < 19 * 60; m += 30) {
        total++;
        if (ocupadoFicticio("barbearia-x", `2026-10-${d}`, p, deMinutos(m))) ocupados++;
      }
    }
  }
  assert.ok(ocupados / total > 0.22 && ocupados / total < 0.38, `taxa ${ocupados / total}`);
});

test("agendar tira o horário da lista daquele profissional", async () => {
  const f = fonte();
  const [hora] = await f.horarios({ servico: "Corte", profissional: "Ana", data: TERCA });
  assert.deepEqual(await f.agendar(pedido({ hora })), { ok: true, profissional: "Ana" });
  assert.ok(!(await f.horarios({ servico: "Corte", profissional: "Ana", data: TERCA })).includes(hora));
});

test("sem preferência: primeiro profissional livre, depois o seguinte, depois ocupado", async () => {
  const f = fonte();
  const ana = await f.horarios({ servico: "Corte", profissional: "Ana", data: TERCA });
  const bruno = await f.horarios({ servico: "Corte", profissional: "Bruno", data: TERCA });
  const hora = ana.find((h) => bruno.includes(h));
  assert.ok(hora, "precisa de um horário livre para os dois");
  assert.deepEqual(await f.agendar(pedido({ profissional: null, hora, celular: "(48) 99876-0001" })), { ok: true, profissional: "Ana" });
  assert.deepEqual(await f.agendar(pedido({ profissional: null, hora, celular: "(48) 99876-0002" })), { ok: true, profissional: "Bruno" });
  assert.deepEqual(await f.agendar(pedido({ profissional: null, hora, celular: "(48) 99876-0003" })), { ok: false, erro: "ocupado" });
  assert.ok(!(await f.horarios({ servico: "Corte", profissional: null, data: TERCA })).includes(hora));
});

test("no máximo 2 agendamentos por celular no mesmo dia", async () => {
  const f = fonte();
  const livres = await f.horarios({ servico: "Corte", profissional: "Ana", data: TERCA });
  assert.equal((await f.agendar(pedido({ hora: livres[0] }))).ok, true);
  assert.equal((await f.agendar(pedido({ hora: livres[1] }))).ok, true);
  assert.deepEqual(await f.agendar(pedido({ hora: livres[2] })), { ok: false, erro: "limite" });
});

test("pedido inválido: isca, fixo, nome curto, e-mail ruim, profissional ou serviço desconhecido", async () => {
  const f = fonte();
  for (const p of [
    pedido({ isca: "http://spam" }), pedido({ celular: "(48) 3333-4444" }), pedido({ nome: "A" }),
    pedido({ email: "maria@" }), pedido({ profissional: "Carlos" }), pedido({ servico: "Luzes" }),
  ]) {
    assert.deepEqual(await f.agendar(p), { ok: false, erro: "invalido" });
  }
});

test("lista vazia: domingo, depois de 14 dias, dia que passou, serviço desconhecido", async () => {
  const f = fonte();
  for (const data of ["2026-10-18", "2026-10-26", "2026-10-11"]) assert.deepEqual(await f.horarios({ servico: "Corte", profissional: "Ana", data }), [], data);
  assert.deepEqual(await f.horarios({ servico: "Luzes", profissional: "Ana", data: TERCA }), []);
});

test("hoje, só a partir de 60 minutos depois de agora (São Paulo)", async () => {
  const hoje = await fonte().horarios({ servico: "Corte", profissional: null, data: "2026-10-12" });
  assert.ok(hoje.length > 0 && hoje.every((h) => h >= "10:00"), hoje.join(","));
});

test("sem profissionais, uma agenda só", async () => {
  const f = fonte({ ...DADOS, profissionais: [] });
  const [hora] = await f.horarios({ servico: "Corte", profissional: null, data: TERCA });
  assert.deepEqual(await f.agendar(pedido({ profissional: null, hora })), { ok: true, profissional: null });
});

test("navegador sem sessionStorage ou com a cota cheia: guarda na memória da página", async () => {
  for (const armazenamento of [
    armazenamentoSeguro(() => { throw new Error("SecurityError"); }),
    armazenamentoSeguro(() => ({ getItem: () => null, setItem: () => { throw new Error("QuotaExceededError"); } })),
  ]) {
    const f = fonte(DADOS, armazenamento);
    const [hora] = await f.horarios({ servico: "Corte", profissional: "Ana", data: TERCA });
    assert.equal((await f.agendar(pedido({ hora }))).ok, true);
    assert.ok(!(await f.horarios({ servico: "Corte", profissional: "Ana", data: TERCA })).includes(hora));
  }
});

test("só grava na chave previa:<slug>:agendamentos", async () => {
  const { m, armazenamento } = memoria();
  const f = fonte(DADOS, armazenamento);
  const [hora] = await f.horarios({ servico: "Corte", profissional: "Ana", data: TERCA });
  await f.agendar(pedido({ hora }));
  assert.deepEqual([...m.keys()], [chaveDaPrevia("exemplo-teste")]);
  assert.equal(chaveDaPrevia("exemplo-teste"), "previa:exemplo-teste:agendamentos");
});
