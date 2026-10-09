const BASE = "https://api.apify.com/v2";
export const ATOR = "compass~crawler-google-places";
const FINAIS = ["SUCCEEDED", "FAILED", "ABORTED", "TIMED-OUT"];

export interface Saldo {
  limiteUsd: number;
  usadoUsd: number;
}

export interface ClienteApify {
  saldo(): Promise<Saldo>;
  rodar(input: Record<string, unknown>, tetoUsd: number): Promise<{ runId: string; itens: unknown[] }>;
}

export function criarClienteApify(token: string, f: typeof fetch = fetch): ClienteApify {
  async function pedir(caminho: string, init: RequestInit = {}): Promise<any> {
    const r = await f(`${BASE}${caminho}`, {
      ...init,
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    });
    if (r.status === 401) throw new Error("Token da Apify inválido. Confira APIFY_TOKEN no arquivo .env.");
    if (!r.ok) throw new Error(`Apify respondeu ${r.status} em ${caminho}: ${await r.text()}`);
    return r.json();
  }

  return {
    async saldo() {
      const { data } = await pedir("/users/me/limits");
      return { limiteUsd: data.limits.maxMonthlyUsageUsd, usadoUsd: data.current.monthlyUsageUsd };
    },
    async rodar(input, tetoUsd) {
      let { data: run } = await pedir(`/acts/${ATOR}/runs?maxTotalChargeUsd=${tetoUsd}`, {
        method: "POST",
        body: JSON.stringify(input),
      });
      while (!FINAIS.includes(run.status)) {
        ({ data: run } = await pedir(`/actor-runs/${run.id}?waitForFinish=60`));
      }
      if (run.status !== "SUCCEEDED") throw new Error(`A execução ${run.id} terminou como ${run.status}.`);
      const itens = await pedir(`/datasets/${run.defaultDatasetId}/items?clean=true&format=json`);
      return { runId: run.id as string, itens: itens as unknown[] };
    },
  };
}
