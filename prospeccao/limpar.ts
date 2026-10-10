import type { Armazem } from "./armazem.ts";
import type { Lead } from "./tipos.ts";

export interface StatusPainel {
  id: string;
  status: string;
  atualizadoEm: string;
  limpo?: boolean;
}

// Arquivo leads/_sistema/painel-status.json: o backup exportado no painel (ver montarBackup em
// painel/logica.js), que traz estes dois campos entre outros.
export interface ExportacaoPainel {
  exportadoEm: string;
  status: StatusPainel[];
}

const QUATORZE_DIAS = 14 * 24 * 60 * 60 * 1000;
export const VALIDADE_EXPORTACAO_MS = 60 * 60 * 1000;

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

// Apaga os dados vencidos. Os status vêm do backup exportado no celular, que precisa ser recente
// e é consumido: rodar de novo sem exportar outra vez falha em vez de agir sobre status antigos.
// O painel publicado é gerado dos arquivos locais, então o próximo build já sai sem esses leads.
export function executarLimpeza(deps: { armazem: Armazem; agora: Date; apagarFotos: (slug: string) => void }) {
  const exportacao = deps.armazem.lerSistema<ExportacaoPainel | null>("painel-status.json", null);
  if (!exportacao || !Array.isArray(exportacao.status) || typeof exportacao.exportadoEm !== "string") {
    throw new Error("Falta leads/_sistema/painel-status.json. Exporte o backup no painel e salve o texto nesse arquivo antes.");
  }
  const idade = deps.agora.getTime() - Date.parse(exportacao.exportadoEm);
  if (!(idade <= VALIDADE_EXPORTACAO_MS)) {
    throw new Error(`O backup do painel é de ${exportacao.exportadoEm}, mais de 1 hora atrás. Exporte de novo antes de limpar.`);
  }
  const apagados = selecionarParaLimpar(deps.armazem.listarLeads(), exportacao.status, deps.agora);
  for (const slug of apagados) {
    deps.armazem.removerLead(slug);
    deps.apagarFotos(slug);
  }
  deps.armazem.removerSistema("painel-status.json");
  return { apagados };
}
