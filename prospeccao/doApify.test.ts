import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { converterLugar } from "./doApify.ts";

const busca = JSON.parse(readFileSync(new URL("./fixtures/lugar-busca.json", import.meta.url), "utf8")) as unknown[];

test("converte barbearia com Instagram e celular", () => {
  const l = converterLugar(busca[0], "barbearia");
  assert.ok(l);
  assert.equal(l.placeId, "ChIJteste000000000000001");
  assert.equal(l.nome, "Barbearia Teste Kobrasol");
  assert.equal(l.termo, "barbearia");
  assert.equal(l.cidade, "São José");
  assert.equal(l.bairro, "Kobrasol");
  assert.equal(l.telefone, "+55 48 99999-0001");
  assert.equal(l.celular, true);
  assert.equal(l.whatsapp, "https://wa.me/5548999990001");
  assert.equal(l.classificacao, "so_rede");
  assert.equal(l.instagram, "@barbeariateste");
  assert.equal(l.nota, 4.8);
  assert.equal(l.avaliacoes, 132);
  assert.equal(l.categoria, "Barbearia");
  assert.equal(l.fechado, false);
});

test("sem website é sem_site; fixo não tem WhatsApp", () => {
  const l = converterLugar(busca[1], "estetica");
  assert.ok(l);
  assert.equal(l.classificacao, "sem_site");
  assert.equal(l.site, null);
  assert.equal(l.celular, false);
  assert.equal(l.whatsapp, null);
});

test("item sem placeId ou sem nome é ignorado", () => {
  assert.equal(converterLugar({ title: "Sem ID" }, "barbearia"), null);
  assert.equal(converterLugar({ placeId: "x" }, "barbearia"), null);
  assert.equal(converterLugar(null, "barbearia"), null);
});

test("item mínimo converte com valores padrão", () => {
  const l = converterLugar({ placeId: "ChIJmin", title: "Mínimo", totalScore: 0 }, "barbearia");
  assert.ok(l);
  assert.equal(l.telefone, "");
  assert.equal(l.celular, false);
  assert.equal(l.nota, null);
  assert.equal(l.avaliacoes, 0);
  assert.equal(l.cidade, "");
  assert.equal(l.bairro, null);
  assert.match(l.mapsUrl, /query_place_id=ChIJmin$/);
});

test("sem phoneUnformatted usa phone para decidir se é celular", () => {
  const l = converterLugar({ placeId: "ChIJp", title: "P", phone: "(48) 99888-7777" }, "barbearia");
  assert.ok(l);
  assert.equal(l.celular, true);
  assert.equal(l.whatsapp, "https://wa.me/5548998887777");
});

test("fechado temporária ou definitivamente vira fechado: true", () => {
  assert.equal(converterLugar({ placeId: "a", title: "A", permanentlyClosed: true }, "barbearia")?.fechado, true);
  assert.equal(converterLugar({ placeId: "b", title: "B", temporarilyClosed: true }, "barbearia")?.fechado, true);
});
