import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import type { Lead } from "./tipos.ts";

export interface RegistroUso {
  quando: string;
  comando: string;
  runId: string;
  gastoEstimadoUsd: number;
  lugares: number;
}

export function criarArmazem(raiz: string) {
  const pastaLeads = join(raiz, "leads");
  const pastaSistema = join(pastaLeads, "_sistema");
  const ler = <T>(arquivo: string, padrao: T): T =>
    existsSync(arquivo) ? (JSON.parse(readFileSync(arquivo, "utf8")) as T) : padrao;
  const gravar = (arquivo: string, valor: unknown) => {
    mkdirSync(dirname(arquivo), { recursive: true });
    writeFileSync(arquivo, JSON.stringify(valor, null, 2) + "\n");
  };
  return {
    raiz,
    lerVistos: () => new Set(ler<string[]>(join(pastaSistema, "vistos.json"), [])),
    salvarVistos: (v: ReadonlySet<string>) => gravar(join(pastaSistema, "vistos.json"), [...v].sort()),
    listarLeads: (): Lead[] =>
      existsSync(pastaLeads)
        ? readdirSync(pastaLeads)
            .filter((f) => f.endsWith(".json"))
            .sort()
            .map((f) => JSON.parse(readFileSync(join(pastaLeads, f), "utf8")) as Lead)
        : [],
    salvarLead: (l: Lead) => gravar(join(pastaLeads, `${l.slug}.json`), l),
    removerLead: (slug: string) => rmSync(join(pastaLeads, `${slug}.json`), { force: true }),
    registrarUso: (r: RegistroUso) =>
      gravar(join(pastaSistema, "uso.json"), [...ler<RegistroUso[]>(join(pastaSistema, "uso.json"), []), r]),
    lerUso: () => ler<RegistroUso[]>(join(pastaSistema, "uso.json"), []),
    gravarSistema: (nome: string, valor: unknown) => gravar(join(pastaSistema, nome), valor),
    lerSistema: <T>(nome: string, padrao: T): T => ler<T>(join(pastaSistema, nome), padrao),
  };
}

export type Armazem = ReturnType<typeof criarArmazem>;
