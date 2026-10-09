import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { converterLugar } from "./doApify.ts";
import { selecionarCandidatos, naRegiao } from "./filtro.ts";
import type { LeadBruto } from "./tipos.ts";

const CIDADES = ["Florianópolis", "São José", "Palhoça", "Biguaçu"];
const busca = JSON.parse(readFileSync(new URL("./fixtures/lugar-busca.json", import.meta.url), "utf8")) as unknown[];
const brutos = busca.map((i) => converterLugar(i, "barbearia")).filter((b) => b !== null);

test("descarta site próprio e mantém sem site e só rede", () => {
  const { candidatos, descartes } = selecionarCandidatos(brutos, new Set(), CIDADES);
  assert.deepEqual(candidatos.map((c) => c.placeId), ["ChIJteste000000000000001", "ChIJteste000000000000002"]);
  assert.equal(descartes.site_proprio, 1);
});

test("mesmo lugar duas vezes na mesma busca entra uma vez só", () => {
  const { candidatos, descartes } = selecionarCandidatos([brutos[0], brutos[0]], new Set(), CIDADES);
  assert.equal(candidatos.length, 1);
  assert.equal(descartes.repetido, 1);
});

test("lugar já visto não volta", () => {
  const { candidatos, descartes } = selecionarCandidatos(brutos, new Set(["ChIJteste000000000000001"]), CIDADES);
  assert.deepEqual(candidatos.map((c) => c.placeId), ["ChIJteste000000000000002"]);
  assert.equal(descartes.ja_visto, 1);
});

test("sem telefone e fora da região são descartados", () => {
  const semTelefone: LeadBruto = { ...brutos[0], placeId: "a", telefone: "" };
  const curitiba: LeadBruto = { ...brutos[0], placeId: "b", cidade: "Curitiba", endereco: "R. X, 1 - Centro, Curitiba - PR" };
  const { candidatos, descartes } = selecionarCandidatos([semTelefone, curitiba], new Set(), CIDADES);
  assert.equal(candidatos.length, 0);
  assert.equal(descartes.sem_telefone, 1);
  assert.equal(descartes.fora_da_regiao, 1);
});

test("cidade vazia é resolvida pelo endereço, com o nome da config", () => {
  const l: LeadBruto = { ...brutos[0], cidade: "", endereco: "R. Y, 5 - Centro, Biguaçu - SC, 88160-000" };
  assert.equal(naRegiao(l, CIDADES), "Biguaçu");
  const { candidatos } = selecionarCandidatos([l], new Set(), CIDADES);
  assert.equal(candidatos[0].cidade, "Biguaçu");
});

test("São José dos Pinhais (PR) não conta como São José", () => {
  const l: LeadBruto = { ...brutos[0], cidade: "São José dos Pinhais", endereco: "R. Z, 9 - Centro, São José dos Pinhais - PR" };
  assert.equal(naRegiao(l, CIDADES), null);
});

test("lugar fechado é descartado", () => {
  const fechado: LeadBruto = { ...brutos[0], placeId: "f", fechado: true };
  const { candidatos, descartes } = selecionarCandidatos([fechado], new Set(), CIDADES);
  assert.equal(candidatos.length, 0);
  assert.equal(descartes.fechado, 1);
});
