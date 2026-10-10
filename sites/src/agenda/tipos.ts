import type { Horarios } from "../ficha/tipos.ts";

export interface ConsultaHorarios {
  servico: string;
  profissional: string | null;
  data: string;
}

export interface PedidoAgendamento extends ConsultaHorarios {
  hora: string;
  nome: string;
  celular: string;
  email?: string;
  isca: string;
}

export type RespostaAgendamento =
  | { ok: true; profissional: string | null }
  | { ok: false; erro: "ocupado" | "limite" | "invalido" };

// O widget fala só com esta interface: no B1 a fonte é simulada; no B2, o Apps Script.
export interface FonteAgenda {
  horarios(q: ConsultaHorarios): Promise<string[]>;
  agendar(p: PedidoAgendamento): Promise<RespostaAgendamento>;
}

export interface DadosAgenda {
  slug: string;
  servicos: { nome: string; duracaoMin: number }[];
  profissionais: string[];
  horarios: Horarios;
  whatsapp: string | null;
  telefone: string | null;
}
