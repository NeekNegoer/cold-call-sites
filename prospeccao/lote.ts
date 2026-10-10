import type { Classificacao, Lead } from "./tipos.ts";

export interface DocumentoPainel {
  slug: string;
  placeId: string;
  nome: string | null;
  nicho: string;
  cidade: string;
  bairro: string | null;
  endereco: string | null;
  telefone: string | null;
  celular: boolean;
  whatsapp: string | null;
  instagram: string | null;
  instagramUrl: string | null;
  classificacao: Classificacao;
  nota: number | null;
  avaliacoes: number | null;
  mapsUrl: string | null;
  score: number;
  previaUrl: string | null;
  status: string;
  proximoContato: string | null;
  notas: string;
  historico: { status: string; em: string }[];
  plano: string | null;
  precoMensal: number | null;
  motivoPerda: string | null;
  limpo: boolean;
  criadoEm: string;
  atualizadoEm: string;
}

export function escolherLote(
  leads: Lead[],
  quantidade: number,
  filtro: { nicho?: string; cidade?: string } = {},
): Lead[] {
  return leads
    .filter(
      (l) =>
        l.fase === "candidato" &&
        (!filtro.nicho || l.nicho === filtro.nicho) &&
        (!filtro.cidade || l.cidade === filtro.cidade),
    )
    .sort((a, b) => b.score - a.score || a.slug.localeCompare(b.slug))
    .slice(0, quantidade);
}

export function paraPainel(l: Lead, agoraISO: string): { id: string; data: DocumentoPainel } {
  return {
    id: l.slug,
    data: {
      slug: l.slug,
      placeId: l.placeId,
      nome: l.nome,
      nicho: l.nicho,
      cidade: l.cidade,
      bairro: l.bairro,
      endereco: l.endereco,
      telefone: l.telefone,
      celular: l.celular,
      whatsapp: l.whatsapp,
      instagram: l.instagram,
      instagramUrl: l.instagram ? `https://www.instagram.com/${l.instagram.slice(1)}/` : null,
      classificacao: l.classificacao,
      nota: l.nota,
      avaliacoes: l.avaliacoes,
      mapsUrl: l.mapsUrl,
      score: l.score,
      previaUrl: null,
      status: "novo",
      proximoContato: null,
      notas: "",
      historico: [{ status: "novo", em: agoraISO }],
      plano: null,
      precoMensal: null,
      motivoPerda: null,
      limpo: false,
      criadoEm: agoraISO,
      atualizadoEm: agoraISO,
    },
  };
}

// Todo lead que já saiu de "candidato" vai para o arquivo do painel. Quem envia pula os ids que
// o painel já tem, então rodar o lote duas vezes antes de enviar não deixa ninguém de fora.
export function documentosDoPainel(leads: Lead[], agoraISO: string): { id: string; data: DocumentoPainel }[] {
  return leads.filter((l) => l.fase !== "candidato").map((l) => paraPainel(l, agoraISO));
}
