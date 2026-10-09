import type { LeadBruto } from "./tipos.ts";

export type MotivoDescarte = "repetido" | "ja_visto" | "sem_telefone" | "fora_da_regiao" | "site_proprio" | "fechado";

export function normalizar(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
}

export function naRegiao(l: LeadBruto, cidades: readonly string[]): string | null {
  const alvo = cidades.map((c) => ({ c, n: normalizar(c) }));
  const porCampo = alvo.find((a) => a.n === normalizar(l.cidade));
  if (porCampo) return porCampo.c;
  const endereco = normalizar(l.endereco);
  return alvo.find((a) => endereco.includes(`${a.n} - sc`))?.c ?? null;
}

export function selecionarCandidatos(
  brutos: LeadBruto[],
  vistos: ReadonlySet<string>,
  cidades: readonly string[],
): { candidatos: LeadBruto[]; descartes: Record<MotivoDescarte, number> } {
  const candidatos: LeadBruto[] = [];
  const descartes: Record<MotivoDescarte, number> = {
    repetido: 0,
    ja_visto: 0,
    sem_telefone: 0,
    fora_da_regiao: 0,
    site_proprio: 0,
    fechado: 0,
  };
  const nestaBusca = new Set<string>();
  for (const b of brutos) {
    if (nestaBusca.has(b.placeId)) {
      descartes.repetido++;
      continue;
    }
    nestaBusca.add(b.placeId);
    if (vistos.has(b.placeId)) {
      descartes.ja_visto++;
      continue;
    }
    if (b.fechado) {
      descartes.fechado++;
      continue;
    }
    if (!b.telefone) {
      descartes.sem_telefone++;
      continue;
    }
    const cidade = naRegiao(b, cidades);
    if (!cidade) {
      descartes.fora_da_regiao++;
      continue;
    }
    if (b.classificacao === "site_proprio") {
      descartes.site_proprio++;
      continue;
    }
    candidatos.push({ ...b, cidade });
  }
  return { candidatos, descartes };
}
