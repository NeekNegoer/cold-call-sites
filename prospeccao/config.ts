import { readFileSync } from "node:fs";

export interface Config {
  cidades: string[];
  uf: string;
  nichos: Record<string, { termos: string[] }>;
  limites: { maxPorTermo: number; tetoUsdPorExecucao: number; lotePadrao: number };
  precosUsd: { lugar: number; detalhe: number; avaliacao: number; imagem: number };
}

export function carregarConfig(): Config {
  return JSON.parse(readFileSync(new URL("./config.json", import.meta.url), "utf8")) as Config;
}
