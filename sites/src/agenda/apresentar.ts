import type { Ficha } from "../ficha/tipos.ts";
import { diaDaSemana, somarDias } from "./horarios.ts";
import type { DadosAgenda } from "./tipos.ts";

const ABREV = { seg: "seg", ter: "ter", qua: "qua", qui: "qui", sex: "sex", sab: "sáb", dom: "dom" } as const;

export function rotuloDia(data: string, hoje: string): string {
  if (data === hoje) return "Hoje";
  if (data === somarDias(hoje, 1)) return "Amanhã";
  const [, mes, dia] = data.split("-");
  return `${ABREV[diaDaSemana(data)]}, ${dia}/${mes}`;
}

export function resumoDoAgendamento(o: { servico: string; data: string; hora: string; profissional: string | null; hoje: string }): string {
  const quando = rotuloDia(o.data, o.hoje);
  const dia = quando === "Hoje" || quando === "Amanhã" ? quando.toLowerCase() : quando;
  return `${o.servico} · ${dia} às ${o.hora}${o.profissional ? ` com ${o.profissional}` : ""}`;
}

// Só o que a gaveta precisa: vai para a página num atributo data-agenda.
export function dadosDaAgenda(ficha: Ficha): DadosAgenda {
  return {
    slug: ficha.slug,
    servicos: ficha.servicos.map(({ nome, duracaoMin }) => ({ nome, duracaoMin })),
    profissionais: ficha.profissionais.map((p) => p.nome),
    horarios: ficha.contato.horarios,
    whatsapp: ficha.contato.whatsapp,
    telefone: ficha.contato.telefone,
  };
}
