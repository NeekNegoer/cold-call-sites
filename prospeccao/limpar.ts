import type { Lead } from "./tipos.ts";

export interface StatusPainel {
  id: string;
  status: string;
  atualizadoEm: string;
}

const QUATORZE_DIAS = 14 * 24 * 60 * 60 * 1000;

export const PATCH_LIMPEZA = {
  limpo: true,
  nome: null,
  endereco: null,
  telefone: null,
  whatsapp: null,
  instagram: null,
  instagramUrl: null,
  bairro: null,
  nota: null,
  avaliacoes: null,
  mapsUrl: null,
  previaUrl: null,
};

export function selecionarParaLimpar(leads: Lead[], status: StatusPainel[], agora: Date): string[] {
  const limite = agora.getTime() - QUATORZE_DIAS;
  const porId = new Map(status.map((s) => [s.id, s]));
  return leads
    .filter((l) => {
      const s = porId.get(l.slug);
      if (!s) return Date.parse(l.buscadoEm) < limite;
      if (s.status === "perdeu") return true;
      if (s.status === "novo" || s.status === "sem_resposta") return Date.parse(s.atualizadoEm) < limite;
      return false;
    })
    .map((l) => l.slug);
}
