import { test } from "node:test";
import assert from "node:assert/strict";
import { criarClienteApify } from "./apify.ts";

function fetchFalso(respostas: { url: RegExp; corpo: unknown; status?: number }[]) {
  const chamadas: { metodo: string; url: string; corpo?: string }[] = [];
  const f = (async (url: string | URL | Request, init?: RequestInit) => {
    const u = String(url);
    chamadas.push({ metodo: init?.method ?? "GET", url: u, corpo: init?.body as string | undefined });
    const i = respostas.findIndex((r) => r.url.test(u));
    if (i < 0) throw new Error(`URL inesperada: ${u}`);
    const [r] = respostas.splice(i, 1);
    return new Response(JSON.stringify(r.corpo), { status: r.status ?? 200 });
  }) as typeof fetch;
  return { f, chamadas };
}

test("saldo lê limite e uso do mês", async () => {
  const { f } = fetchFalso([
    { url: /\/users\/me\/limits$/, corpo: { data: { limits: { maxMonthlyUsageUsd: 5 }, current: { monthlyUsageUsd: 1.25 } } } },
  ]);
  assert.deepEqual(await criarClienteApify("t", f).saldo(), { limiteUsd: 5, usadoUsd: 1.25 });
});

test("rodar inicia com teto, espera terminar e devolve os itens", async () => {
  const { f, chamadas } = fetchFalso([
    { url: /\/acts\/compass~crawler-google-places\/runs\?maxTotalChargeUsd=0\.5$/, corpo: { data: { id: "r1", status: "RUNNING", defaultDatasetId: "d1" } } },
    { url: /\/actor-runs\/r1\?waitForFinish=60$/, corpo: { data: { id: "r1", status: "RUNNING", defaultDatasetId: "d1" } } },
    { url: /\/actor-runs\/r1\?waitForFinish=60$/, corpo: { data: { id: "r1", status: "SUCCEEDED", defaultDatasetId: "d1" } } },
    { url: /\/datasets\/d1\/items\?clean=true&format=json$/, corpo: [{ placeId: "x" }] },
  ]);
  const r = await criarClienteApify("t", f).rodar({ searchStringsArray: ["barbearia"] }, 0.5);
  assert.deepEqual(r, { runId: "r1", itens: [{ placeId: "x" }] });
  assert.equal(chamadas[0].metodo, "POST");
  assert.deepEqual(JSON.parse(chamadas[0].corpo ?? "{}"), { searchStringsArray: ["barbearia"] });
});

test("execução que falha vira erro", async () => {
  const { f } = fetchFalso([
    { url: /\/runs\?/, corpo: { data: { id: "r2", status: "FAILED", defaultDatasetId: "d2" } } },
  ]);
  await assert.rejects(criarClienteApify("t", f).rodar({}, 1), /r2 terminou como FAILED/);
});

test("token inválido tem mensagem clara", async () => {
  const { f } = fetchFalso([{ url: /\/users\/me\/limits$/, corpo: { error: "x" }, status: 401 }]);
  await assert.rejects(criarClienteApify("t", f).saldo(), /Token da Apify inválido/);
});
