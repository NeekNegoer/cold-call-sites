import { test } from "node:test";
import assert from "node:assert/strict";
import {
  hojeLocal, somarDias, visaoDe, filtrarLeads, ordenarLeads, contagens, mudarStatus,
  indicadorPreco, ajustarTabela, formatarReais, dataCurta, precisaDeMotivo, precisaDePlano, TABELA_PADRAO,
  anotar, mesclarLeads, montarBackup, importarBackup,
} from "./logica.js";

const HOJE = "2026-10-13";
const lead = (p: Record<string, unknown> = {}) => ({
  slug: "x", nome: "X", nicho: "barbearia", cidade: "São José", telefone: "+55 48 99999-0001", score: 50,
  status: "novo", proximoContato: null, historico: [{ status: "novo", em: "2026-10-09T19:00:00.000Z" }],
  plano: null, precoMensal: null, motivoPerda: null, limpo: false, atualizadoEm: "2026-10-09T19:00:00.000Z",
  ...p,
});

test("datas", () => {
  assert.equal(hojeLocal(new Date("2026-10-10T01:30:00Z")), "2026-10-09");
  assert.equal(somarDias("2026-10-31", 1), "2026-11-01");
  assert.equal(dataCurta("2026-10-12"), "12/10");
});

test("visão de cada lead", () => {
  assert.equal(visaoDe(lead(), HOJE), "ligar");
  assert.equal(visaoDe(lead({ status: "sem_resposta", proximoContato: "2026-10-13" }), HOJE), "ligar");
  assert.equal(visaoDe(lead({ status: "retornar", proximoContato: "2026-10-20" }), HOJE), "depois");
  assert.equal(visaoDe(lead({ status: "interessado" }), HOJE), "negociacao");
  assert.equal(visaoDe(lead({ status: "fechou" }), HOJE), "fechados");
  assert.equal(visaoDe(lead({ status: "perdeu" }), HOJE), "perdidos");
});

test("arquivado ou sem telefone não aparece para ligar", () => {
  assert.equal(visaoDe(lead({ limpo: true, telefone: null }), HOJE), "arquivados");
  assert.equal(visaoDe(lead({ telefone: null }), HOJE), "arquivados");
  const leads = [lead({ slug: "a" }), lead({ slug: "b", limpo: true, telefone: null })];
  assert.deepEqual(filtrarLeads(leads, { visao: "ligar", nicho: "", cidade: "" }, HOJE).map((l: any) => l.slug), ["a"]);
  assert.deepEqual(filtrarLeads(leads, { visao: "todos", nicho: "", cidade: "" }, HOJE).map((l: any) => l.slug), ["a", "b"]);
});

test("filtra por nicho e cidade", () => {
  const leads = [lead({ slug: "a" }), lead({ slug: "b", nicho: "estetica", cidade: "Palhoça" })];
  assert.deepEqual(filtrarLeads(leads, { visao: "todos", nicho: "estetica", cidade: "" }, HOJE).map((l: any) => l.slug), ["b"]);
  assert.deepEqual(filtrarLeads(leads, { visao: "todos", nicho: "", cidade: "São José" }, HOJE).map((l: any) => l.slug), ["a"]);
});

test("ordem: retornos vencidos, depois sem data por score, depois futuros, finais no fim", () => {
  const leads = [
    lead({ slug: "final", status: "fechou", atualizadoEm: "2026-10-12T10:00:00Z" }),
    lead({ slug: "futuro", status: "retornar", proximoContato: "2026-10-15" }),
    lead({ slug: "semdata-baixo", score: 20 }),
    lead({ slug: "semdata-alto", score: 90 }),
    lead({ slug: "vencido-ontem", status: "retornar", proximoContato: "2026-10-12" }),
    lead({ slug: "vencido-hoje", status: "sem_resposta", proximoContato: "2026-10-13" }),
  ];
  assert.deepEqual(ordenarLeads(leads, HOJE).map((l: any) => l.slug), [
    "vencido-ontem", "vencido-hoje", "semdata-alto", "semdata-baixo", "futuro", "final",
  ]);
});

test("contagens do resumo", () => {
  const c = contagens([
    lead(), lead({ status: "retornar", proximoContato: "2026-10-13" }), lead({ status: "interessado" }),
    lead({ status: "fechou" }), lead({ status: "perdeu" }), lead({ limpo: true, telefone: null }),
  ], HOJE);
  assert.deepEqual(c, { ligar: 2, vencidos: 1, depois: 0, negociacao: 1, fechados: 1, perdidos: 1, arquivados: 1 });
});

test("perdeu exige motivo e limpa o próximo contato", () => {
  assert.equal(precisaDeMotivo("perdeu"), true);
  assert.throws(() => mudarStatus(lead(), "perdeu", "t1"), /motivo/);
  const p = mudarStatus(lead({ proximoContato: "2026-10-20" }), "perdeu", "t1", { motivoPerda: "preco" });
  assert.equal(p.status, "perdeu");
  assert.equal(p.motivoPerda, "preco");
  assert.equal(p.proximoContato, null);
  assert.deepEqual(p.historico.at(-1), { status: "perdeu", em: "t1" });
  assert.equal(p.atualizadoEm, "t1");
});

test("interessado, reunião e fechou exigem plano e preço", () => {
  assert.equal(precisaDePlano("interessado"), true);
  assert.equal(precisaDePlano("sem_resposta"), false);
  assert.throws(() => mudarStatus(lead(), "interessado", "t1"), /plano/);
  const p = mudarStatus(lead(), "interessado", "t1", { plano: "equipe", precoMensal: 89 });
  assert.equal(p.plano, "equipe");
  assert.equal(p.precoMensal, 89);
  const q = mudarStatus(lead({ status: "interessado", plano: "equipe", precoMensal: 89 }), "fechou", "t2");
  assert.equal(q.plano, "equipe");
  assert.equal(q.proximoContato, null);
});

test("voltar de perdeu limpa o motivo; status desconhecido dá erro", () => {
  assert.equal(mudarStatus(lead({ status: "perdeu", motivoPerda: "preco" }), "retornar", "t1").motivoPerda, null);
  assert.throws(() => mudarStatus(lead(), "sumiu", "t1"), /Status desconhecido/);
});

test("indicador de preço usa só decididos com a tabela atual", () => {
  const tabela = { ...TABELA_PADRAO };
  const decidido = (i: number, status: string, motivo: string | null = null, preco = 89) =>
    lead({
      slug: `d${i}`, status, plano: "equipe", precoMensal: preco, motivoPerda: motivo,
      historico: [{ status: "interessado", em: `2026-10-0${i % 9 + 1}T10:00:00Z` }, { status, em: `2026-10-1${i % 9}T10:00:00Z` }],
    });
  const nove = Array.from({ length: 9 }, (_, i) => decidido(i, "fechou"));
  assert.equal(indicadorPreco(nove, tabela).sugestao, "aguardar");
  assert.equal(indicadorPreco(nove, tabela).amostra, 9);
  const dez = [...nove, decidido(9, "fechou")];
  assert.equal(indicadorPreco(dez, tabela).sugestao, "subir");
  const umaRecusa = [...nove, decidido(9, "perdeu", "preco")];
  assert.deepEqual(indicadorPreco(umaRecusa, tabela), { amostra: 10, recusasPreco: 1, sugestao: "manter" });
  const duas = [...nove.slice(1), decidido(9, "perdeu", "preco"), decidido(10, "perdeu", "preco")];
  assert.equal(indicadorPreco(duas, tabela).sugestao, "descer");
  const outraTabela = [...nove, decidido(9, "perdeu", "preco", 79)];
  assert.equal(indicadorPreco(outraTabela, tabela).amostra, 9);
});

test("ajuste e formato de preço", () => {
  assert.deepEqual(ajustarTabela(TABELA_PADRAO, 10), { solo: 69, equipe: 99, casaCheia: 139 });
  assert.equal(formatarReais(59), "R$ 59");
  assert.equal(formatarReais(59.9), "R$ 59,90");
});

test("anotação guarda só campos do caderno e vale por cima do arquivo publicado", () => {
  const a = anotar({}, "x", { status: "retornar", notas: "falar com o Zé", nome: "Outro nome", atualizadoEm: "t1" });
  assert.deepEqual(a, { x: { status: "retornar", notas: "falar com o Zé", atualizadoEm: "t1" } });
  const b = anotar(a, "x", { proximoContato: "2026-10-20" });
  assert.equal(b.x.notas, "falar com o Zé");
  assert.equal(b.x.proximoContato, "2026-10-20");
  const leads = mesclarLeads([lead()], b);
  assert.equal(leads.get("x").nome, "X");
  assert.equal(leads.get("x").status, "retornar");
  assert.equal(leads.get("x").proximoContato, "2026-10-20");
});

test("anotação de lead que saiu do arquivo continua visível como arquivado", () => {
  const leads = mesclarLeads([], { sumiu: { status: "perdeu", motivoPerda: "preco", notas: "achou caro", atualizadoEm: "t1" } });
  const l = leads.get("sumiu");
  assert.equal(visaoDe(l, HOJE), "arquivados");
  assert.equal(l.notas, "achou caro");
  assert.equal(l.limpo, true);
});

test("backup leva o status de todos os leads, anotados ou não", () => {
  const leads = mesclarLeads([lead({ slug: "a" }), lead({ slug: "b" })], anotar({}, "b", { status: "perdeu", atualizadoEm: "t9" }));
  const backup = montarBackup(leads.values(), { b: { status: "perdeu" } }, TABELA_PADRAO, "2026-10-13T12:00:00.000Z");
  assert.equal(backup.exportadoEm, "2026-10-13T12:00:00.000Z");
  assert.deepEqual(backup.status, [
    { id: "a", status: "novo", atualizadoEm: "2026-10-09T19:00:00.000Z", limpo: false },
    { id: "b", status: "perdeu", atualizadoEm: "t9", limpo: false },
  ]);
  assert.deepEqual(backup.oferta, TABELA_PADRAO);
});

test("importar backup: a anotação mais recente vence; texto estranho dá erro", () => {
  const atuais = { a: { notas: "nova", atualizadoEm: "2026-10-12" }, b: { notas: "velha", atualizadoEm: "2026-10-01" } };
  const texto = JSON.stringify({
    tipo: "caderno-backup", exportadoEm: "t", oferta: { solo: 69, equipe: 99, casaCheia: 139 },
    anotacoes: { a: { notas: "do backup", atualizadoEm: "2026-10-10" }, b: { notas: "do backup", atualizadoEm: "2026-10-10" }, c: { notas: "só no backup" } },
  });
  const r = importarBackup(atuais, texto);
  assert.equal(r.anotacoes.a.notas, "nova");
  assert.equal(r.anotacoes.b.notas, "do backup");
  assert.equal(r.anotacoes.c.notas, "só no backup");
  assert.deepEqual(r.oferta, { solo: 69, equipe: 99, casaCheia: 139 });
  assert.throws(() => importarBackup(atuais, "oi"), /Backup inválido/);
  assert.throws(() => importarBackup(atuais, "{}"), /Backup inválido/);
});
