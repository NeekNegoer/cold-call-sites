import type { Lead } from "../../../prospeccao/tipos.ts";
import { layoutsDoNicho } from "../tema/layouts.ts";
import { converterHorarios } from "./horarios.ts";
import { NICHOS, type Depoimento, type Dia, type Ficha, type Intervalo, type Nicho, type Servico } from "./tipos.ts";

export interface ConfigNicho {
  servicos: Servico[];
  horarioPadrao: Record<Dia, Intervalo[]>;
  textos: Ficha["textos"];
}
export type Nichos = Record<Nicho, ConfigNicho>;

export const MAX_DEPOIMENTO = 300;
export const MAX_TRECHO = 160;

// Quem avaliou aparece como "Carlos S.": a prévia é pública e não precisa do nome completo.
export function abreviarAutor(nome: string): string {
  const partes = nome.trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return "Cliente do Google";
  if (partes.length === 1) return partes[0];
  return `${partes[0]} ${partes[partes.length - 1][0].toUpperCase()}.`;
}

export function cortarTexto(texto: string, max = MAX_DEPOIMENTO): string {
  const limpo = texto.replace(/\s+/g, " ").trim();
  if (limpo.length <= max) return limpo;
  const corte = limpo.slice(0, max - 1);
  const fimDaPalavra = corte.lastIndexOf(" ");
  return `${(fimDaPalavra > 0 ? corte.slice(0, fimDaPalavra) : corte).replace(/[\s,;:.!?–—-]+$/, "")}…`;
}

// Trecho de uma avaliação: frases inteiras do começo, até o limite. Sem frase que caiba, corta na palavra.
export function trechoDe(texto: string, max = MAX_TRECHO): string {
  const limpo = texto.replace(/\s+/g, " ").trim().replace(/^[^\p{L}\p{N}"“]+/u, "");
  const frases = limpo.match(/[^.!?…]+[.!?…]+|[^.!?…]+$/g)?.map((f) => f.trim()) ?? [];
  let trecho = "";
  for (const frase of frases) {
    const junto = trecho ? `${trecho} ${frase}` : frase;
    if (junto.length > max) break;
    trecho = junto;
  }
  return trecho || cortarTexto(limpo, max);
}

export function escolherDepoimentos(reviews: { autor: string; texto: string; nota: number }[]): Depoimento[] {
  return reviews
    .filter((r) => r.texto.trim() && r.nota >= 4)
    .sort((a, b) => b.nota - a.nota || b.texto.trim().length - a.texto.trim().length)
    .slice(0, 5)
    .map((r) => ({ autor: abreviarAutor(r.autor), texto: trechoDe(r.texto), nota: Math.round(r.nota) }));
}

const preencher = (modelo: string, v: Record<string, string>) => modelo.replace(/\{(\w+)\}/g, (_, k: string) => v[k] ?? `{${k}}`);

export function rascunhoDaFicha(lead: Lead, o: { nichos: Nichos; sufixo: string; fotos: string[] }): { ficha: Ficha; pendencias: string[] } {
  const nicho = NICHOS.find((n) => n === lead.nicho);
  if (!nicho) throw new Error(`Nicho sem layout: ${lead.nicho}`);
  const cfg = o.nichos[nicho];
  const layout = layoutsDoNicho(nicho)[0];
  const pendencias: string[] = [];
  const convertido = converterHorarios(lead.detalhes?.horarios ?? []);
  if (convertido) pendencias.push(...convertido.pendentes);
  else pendencias.push("Sem horário no Google: usei o horário padrão do nicho, e a seção de horário fica escondida.");
  const vars = { nome: lead.nome, lugar: lead.bairro ?? lead.cidade, cidade: lead.cidade };
  return {
    pendencias,
    ficha: {
      slug: lead.slug,
      sufixo: o.sufixo,
      placeId: lead.placeId,
      modo: "previa",
      nicho,
      layout: layout.id,
      nome: lead.nome,
      rascunho: true,
      tema: { ...layout.temaPadrao },
      textos: {
        titulo: preencher(cfg.textos.titulo, vars),
        subtitulo: preencher(cfg.textos.subtitulo, vars),
        sobre: preencher(cfg.textos.sobre, vars),
        chamada: cfg.textos.chamada,
      },
      servicos: cfg.servicos.map((s) => ({ ...s })),
      profissionais: [],
      depoimentos: escolherDepoimentos(lead.detalhes?.reviews ?? []),
      fotos: o.fotos.map((arquivo, i) => ({ arquivo, alt: `${lead.nome}, foto ${i + 1}` })),
      contato: {
        telefone: lead.telefone || null,
        whatsapp: lead.whatsapp,
        instagram: lead.instagram,
        endereco: lead.endereco || null,
        mapsUrl: lead.mapsUrl || null,
        horarios: convertido ? convertido.horarios : structuredClone(cfg.horarioPadrao),
        horariosEstimados: !convertido,
      },
      agenda: "simulada",
    },
  };
}
