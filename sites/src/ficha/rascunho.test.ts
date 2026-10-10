import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { leadDeTeste } from "../../../prospeccao/fixtures/lead.ts";
import type { Detalhes } from "../../../prospeccao/tipos.ts";
import { layoutPorId } from "../tema/layouts.ts";
import { abreviarAutor, cortarTexto, escolherDepoimentos, rascunhoDaFicha, type Nichos } from "./rascunho.ts";
import { validarFicha } from "./validar.ts";

const nichos = JSON.parse(readFileSync(new URL("../../nichos.json", import.meta.url), "utf8")) as Nichos;
const SEMANA = ["segunda-feira", "terça-feira", "quarta-feira", "quinta-feira", "sexta-feira"].map((dia) => ({ dia, horas: "09:00 to 20:00" }))
  .concat([{ dia: "sábado", horas: "09:00 to 17:00" }, { dia: "domingo", horas: "Fechado" }]);
const detalhes = (parcial: Partial<Detalhes> = {}): Detalhes => ({
  horarios: SEMANA,
  coordenadas: null,
  reviews: [
    { autor: "Carlos Medeiros Silva", texto: "Ótimo corte, atendimento no horário.", nota: 5 },
    { autor: "Ana", texto: "Gostei.", nota: 4 },
  ],
  fotos: [],
  detalhadoEm: "2026-10-10T12:00:00.000Z",
  ...parcial,
});
const lead = (parcial = {}) => leadDeTeste({ fase: "detalhado", detalhes: detalhes(), ...parcial });

test("abreviarAutor: primeiro nome + inicial do sobrenome", () => {
  assert.equal(abreviarAutor("Carlos Medeiros Silva"), "Carlos S.");
  assert.equal(abreviarAutor("João de souza"), "João S.");
  assert.equal(abreviarAutor("ana"), "ana");
  assert.equal(abreviarAutor("   "), "Cliente do Google");
});

test("cortarTexto: junta espaços e corta no fim de uma palavra, com reticências", () => {
  assert.equal(cortarTexto("  bom   demais "), "bom demais");
  const longo = "palavra ".repeat(60).trim();
  const cortado = cortarTexto(longo);
  assert.ok(cortado.length <= 300 && cortado.endsWith("palavra…"), cortado);
});

test("escolherDepoimentos: só nota 4+ com texto, nota maior e texto mais longo primeiro, até 5", () => {
  const r = escolherDepoimentos([
    { autor: "A A", texto: "ruim", nota: 3 },
    { autor: "B B", texto: "  ", nota: 5 },
    { autor: "C C", texto: "curto", nota: 5 },
    { autor: "D D", texto: "nota quatro", nota: 4 },
    { autor: "E E", texto: "mais longo que curto", nota: 5 },
    { autor: "F F", texto: "f", nota: 4 },
    { autor: "G G", texto: "g", nota: 4 },
    { autor: "H H", texto: "h", nota: 4 },
  ]);
  assert.deepEqual(r.map((d) => d.texto), ["mais longo que curto", "curto", "nota quatro", "f", "g"]);
  assert.equal(r[0].autor, "E E.");
});

test("rascunho de um lead detalhado: layout e tema do nicho, serviços sem preço, textos com o bairro, válido", () => {
  const { ficha, pendencias } = rascunhoDaFicha(lead(), { nichos, sufixo: "k7q2", fotos: ["1.jpg", "2.jpg"] });
  assert.equal(ficha.layout, "classica");
  assert.deepEqual(ficha.tema, layoutPorId("classica").temaPadrao);
  assert.deepEqual(ficha.servicos, nichos.barbearia.servicos);
  assert.equal(ficha.textos.titulo, "Seu corte em dia em Kobrasol");
  assert.deepEqual(ficha.fotos, [{ arquivo: "1.jpg", alt: "Barbearia X, foto 1" }, { arquivo: "2.jpg", alt: "Barbearia X, foto 2" }]);
  assert.deepEqual(ficha.depoimentos[0], { autor: "Carlos S.", texto: "Ótimo corte, atendimento no horário.", nota: 5 });
  assert.deepEqual(ficha.contato.horarios.sab, [["09:00", "17:00"]]);
  assert.equal(ficha.contato.horariosEstimados, false);
  assert.equal(ficha.rascunho, true);
  assert.equal(ficha.agenda, "simulada");
  assert.deepEqual(pendencias, []);
  assert.doesNotThrow(() => validarFicha(ficha, "rascunho.json"));
});

test("sem horário no Google: horário padrão do nicho, marcado como estimado, com pendência", () => {
  const { ficha, pendencias } = rascunhoDaFicha(lead({ detalhes: detalhes({ horarios: [] }) }), { nichos, sufixo: "k7q2", fotos: [] });
  assert.deepEqual(ficha.contato.horarios, nichos.barbearia.horarioPadrao);
  assert.equal(ficha.contato.horariosEstimados, true);
  assert.ok(pendencias.some((p) => p.startsWith("Sem horário no Google")));
});

test("sem bairro, os textos usam a cidade; nicho sem layout é recusado", () => {
  assert.equal(rascunhoDaFicha(lead({ bairro: null }), { nichos, sufixo: "k7q2", fotos: [] }).ficha.textos.titulo, "Seu corte em dia em São José");
  assert.throws(() => rascunhoDaFicha(lead({ nicho: "petshop" }), { nichos, sufixo: "k7q2", fotos: [] }), /Nicho sem layout: petshop/);
});
