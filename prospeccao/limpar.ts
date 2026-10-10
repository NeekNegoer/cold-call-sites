import type { Armazem } from "./armazem.ts";
import type { Lead } from "./tipos.ts";

export interface StatusPainel {
  id: string;
  status: string;
  atualizadoEm: string;
  limpo?: boolean;
}

// Arquivo leads/_sistema/painel-status.json, gravado por Claude a partir do painel.
export interface ExportacaoPainel {
  exportadoEm: string;
  status: StatusPainel[];
}

const QUATORZE_DIAS = 14 * 24 * 60 * 60 * 1000;
export const VALIDADE_EXPORTACAO_MS = 60 * 60 * 1000;

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

function deveLimpar(s: StatusPainel, limite: number): boolean {
  if (s.status === "perdeu") return true;
  return (s.status === "novo" || s.status === "sem_resposta") && Date.parse(s.atualizadoEm) < limite;
}

export function selecionarParaLimpar(leads: Lead[], status: StatusPainel[], agora: Date): string[] {
  const limite = agora.getTime() - QUATORZE_DIAS;
  const porId = new Map(status.map((s) => [s.id, s]));
  return leads
    .filter((l) => {
      const s = porId.get(l.slug);
      return s ? deveLimpar(s, limite) : Date.parse(l.buscadoEm) < limite;
    })
    .map((l) => l.slug);
}

export function selecionarNoPainel(status: StatusPainel[], agora: Date): string[] {
  const limite = agora.getTime() - QUATORZE_DIAS;
  return status.filter((s) => !s.limpo && deveLimpar(s, limite)).map((s) => s.id);
}

// Apaga dados vencidos e prepara os patches do painel. A exportação precisa ser recente e é
// consumida: rodar de novo sem exportar outra vez falha em vez de agir sobre status antigos.
export function executarLimpeza(deps: { armazem: Armazem; agora: Date; apagarFotos: (slug: string) => void }) {
  const exportacao = deps.armazem.lerSistema<ExportacaoPainel | null>("painel-status.json", null);
  if (!exportacao || !Array.isArray(exportacao.status) || typeof exportacao.exportadoEm !== "string") {
    throw new Error("Falta leads/_sistema/painel-status.json no formato atual. Peça ao Claude para exportar os status do painel antes.");
  }
  const idade = deps.agora.getTime() - Date.parse(exportacao.exportadoEm);
  if (!(idade <= VALIDADE_EXPORTACAO_MS)) {
    throw new Error(`A exportação do painel é de ${exportacao.exportadoEm}, mais de 1 hora atrás. Peça ao Claude para exportar os status de novo antes de limpar.`);
  }
  const apagados = selecionarParaLimpar(deps.armazem.listarLeads(), exportacao.status, deps.agora);
  for (const slug of apagados) {
    deps.armazem.removerLead(slug);
    deps.apagarFotos(slug);
  }
  const paraPainel = selecionarNoPainel(exportacao.status, deps.agora).map((id) => ({ id, patch: PATCH_LIMPEZA }));
  deps.armazem.gravarSistema("painel-limpar.json", paraPainel);
  deps.armazem.removerSistema("painel-status.json");
  return { apagados, paraPainel };
}
