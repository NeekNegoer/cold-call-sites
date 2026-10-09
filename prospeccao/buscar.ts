import type { ClienteApify } from "./apify.ts";
import type { Armazem } from "./armazem.ts";
import type { Config } from "./config.ts";
import type { Lead } from "./tipos.ts";
import { converterLugar } from "./doApify.ts";
import { selecionarCandidatos } from "./filtro.ts";
import { gerarSlug } from "./slug.ts";
import { pontuar } from "./pontuacao.ts";
import { mensagemSemSaldo, podeRodar, validarTeto } from "./custo.ts";

export interface OpcoesBusca {
  nicho: string;
  cidade: string;
  bairro?: string;
  termos?: string[];
  maxPorTermo?: number;
  tetoUsd?: number;
}

export function montarEntradaBusca(o: OpcoesBusca, config: Config) {
  const termos = o.termos?.length ? o.termos : config.nichos[o.nicho]?.termos;
  if (!termos) throw new Error(`Nicho desconhecido: ${o.nicho}. Use: ${Object.keys(config.nichos).join(", ")}.`);
  if (!config.cidades.includes(o.cidade)) {
    throw new Error(`Cidade fora da região: ${o.cidade}. Use: ${config.cidades.join(", ")}.`);
  }
  return {
    searchStringsArray: termos,
    locationQuery: [o.bairro, o.cidade, config.uf, "Brasil"].filter(Boolean).join(", "),
    maxCrawledPlacesPerSearch: o.maxPorTermo ?? config.limites.maxPorTermo,
    language: "pt-BR",
    scrapePlaceDetailPage: false,
    maxImages: 0,
    maxReviews: 0,
  };
}

export async function executarBusca(
  o: OpcoesBusca,
  deps: { cliente: ClienteApify; armazem: Armazem; config: Config; agora: () => Date },
) {
  const entrada = montarEntradaBusca(o, deps.config);
  const teto = o.tetoUsd ?? deps.config.limites.tetoUsdPorExecucao;
  validarTeto(teto);
  const antes = await deps.cliente.saldo();
  if (!podeRodar(antes, teto)) throw new Error(mensagemSemSaldo(antes, teto));

  const { runId, itens } = await deps.cliente.rodar(entrada, teto);

  const brutos = itens.map((i) => converterLugar(i, o.nicho)).filter((b) => b !== null);
  const vistos = deps.armazem.lerVistos();
  const { candidatos, descartes } = selecionarCandidatos(brutos, vistos, deps.config.cidades);
  const slugs = new Set(deps.armazem.listarLeads().map((l) => l.slug));
  const agoraISO = deps.agora().toISOString();
  const novos = candidatos.map((c): Lead => {
    const slug = gerarSlug(c.nome, slugs);
    slugs.add(slug);
    return { ...c, slug, score: pontuar(c), fase: "candidato", buscadoEm: agoraISO, lote: null, detalhes: null };
  });

  for (const l of novos) deps.armazem.salvarLead(l);
  for (const b of brutos) vistos.add(b.placeId);
  deps.armazem.salvarVistos(vistos);

  // Estimativa: a Apify só registra o gasto real alguns minutos depois da execução.
  deps.armazem.registrarUso({
    quando: agoraISO,
    comando: ["buscar", o.nicho, o.cidade, o.bairro].filter(Boolean).join(" "),
    runId,
    gastoEstimadoUsd: itens.length * deps.config.precosUsd.lugar,
    lugares: itens.length,
  });
  return { lugares: itens.length, descartes, novos: novos.sort((a, b) => b.score - a.score) };
}
