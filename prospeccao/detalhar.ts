import { join } from "node:path";
import type { ClienteApify } from "./apify.ts";
import type { Armazem } from "./armazem.ts";
import type { Config } from "./config.ts";
import { converterDetalhes } from "./doApify.ts";
import { mensagemSemSaldo, podeRodar, validarTeto } from "./custo.ts";
import type { Lead } from "./tipos.ts";

export function montarEntradaDetalhes(placeIds: string[]) {
  return {
    placeIds,
    language: "pt-BR",
    scrapePlaceDetailPage: true,
    maxImages: 4,
    maxReviews: 5,
    reviewsSort: "mostRelevant",
  };
}

export async function executarDetalhes(
  o: { slugs: string[]; tetoUsd?: number },
  deps: {
    cliente: ClienteApify;
    armazem: Armazem;
    config: Config;
    agora: () => Date;
    baixar: (urls: string[], destinoRelativo: string) => Promise<string[]>;
  },
) {
  // Só quem você pediu: detalhar gasta crédito da Apify, então nada é detalhado em lote.
  const pedidos = [...new Set(o.slugs)];
  if (pedidos.length === 0) throw new Error("Diga quais leads detalhar: npm run detalhar -- <slug> [<slug>...]");
  const porSlug = new Map(deps.armazem.listarLeads().map((l) => [l.slug, l] as const));
  const desconhecidos = pedidos.filter((s) => !porSlug.has(s));
  if (desconhecidos.length) throw new Error(`Lead não encontrado: ${desconhecidos.join(", ")}`);
  const candidatos = pedidos.filter((s) => porSlug.get(s)?.fase === "candidato");
  if (candidatos.length) throw new Error(`Ainda não estão no caderno (rode npm run lote antes): ${candidatos.join(", ")}`);
  const jaDetalhados = pedidos.filter((s) => porSlug.get(s)?.fase === "detalhado");
  const alvo = pedidos.map((s) => porSlug.get(s)).filter((l): l is Lead => l?.fase === "lote");
  if (alvo.length === 0) return { detalhados: [] as string[], semDados: [] as string[], jaDetalhados };

  const teto = o.tetoUsd ?? deps.config.limites.tetoUsdPorExecucao;
  validarTeto(teto);
  const antes = await deps.cliente.saldo();
  if (!podeRodar(antes, teto)) throw new Error(mensagemSemSaldo(antes, teto));
  const { runId, itens } = await deps.cliente.rodar(montarEntradaDetalhes(alvo.map((l) => l.placeId)), teto);

  const detalhes = itens.map((i) => converterDetalhes(i)).filter((d) => d !== null);
  const porId = new Map(detalhes.map((d) => [d.placeId, d] as const));
  const agoraISO = deps.agora().toISOString();
  const detalhados: string[] = [];
  const semDados: string[] = [];
  for (const l of alvo) {
    const d = porId.get(l.placeId);
    if (!d) {
      semDados.push(l.slug);
      continue;
    }
    const fotos = await deps.baixar(d.imagens, join("sites", "public", "fotos", l.slug));
    deps.armazem.salvarLead({
      ...l,
      fase: "detalhado",
      detalhes: { horarios: d.horarios, coordenadas: d.coordenadas, reviews: d.reviews, fotos, detalhadoEm: agoraISO },
    });
    detalhados.push(l.slug);
  }

  // Estimativa: a Apify só registra o gasto real alguns minutos depois da execução.
  const p = deps.config.precosUsd;
  deps.armazem.registrarUso({
    quando: agoraISO,
    comando: "detalhar",
    runId,
    gastoEstimadoUsd:
      itens.length * (p.lugar + p.detalhe) +
      detalhes.reduce((s, d) => s + d.reviews.length * p.avaliacao + d.imagens.length * p.imagem, 0),
    lugares: itens.length,
  });
  return { detalhados, semDados, jaDetalhados };
}
