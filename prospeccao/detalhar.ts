import { join } from "node:path";
import type { ClienteApify } from "./apify.ts";
import type { Armazem } from "./armazem.ts";
import type { Config } from "./config.ts";
import { converterDetalhes } from "./doApify.ts";
import { mensagemSemSaldo, podeRodar, validarTeto } from "./custo.ts";

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
  o: { quantidade?: number; tetoUsd?: number },
  deps: {
    cliente: ClienteApify;
    armazem: Armazem;
    config: Config;
    agora: () => Date;
    baixar: (urls: string[], destinoRelativo: string) => Promise<string[]>;
  },
) {
  const alvo = deps.armazem
    .listarLeads()
    .filter((l) => l.fase === "lote")
    .sort((a, b) => b.score - a.score)
    .slice(0, o.quantidade ?? deps.config.limites.lotePadrao);
  if (alvo.length === 0) return { detalhados: [] as string[], semDados: [] as string[] };

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
  return { detalhados, semDados };
}
