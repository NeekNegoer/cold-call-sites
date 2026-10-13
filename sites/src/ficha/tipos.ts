export type Nicho = "barbearia" | "estetica";
export const NICHOS: readonly Nicho[] = ["barbearia", "estetica"];

export type Dia = "seg" | "ter" | "qua" | "qui" | "sex" | "sab" | "dom";
export const DIAS: readonly Dia[] = ["seg", "ter", "qua", "qui", "sex", "sab", "dom"];

// "HH:MM"; o fim pode ser "24:00" (até a meia-noite).
export type Intervalo = [inicio: string, fim: string];
// null = dia pendente: só existe no rascunho, a validação recusa fora dele.
export type Horarios = Record<Dia, Intervalo[] | null>;

export interface Servico {
  nome: string;
  duracaoMin: number;
  preco?: number;
}

export interface Profissional {
  nome: string;
  foto?: string;
}

export interface Depoimento {
  autor: string;
  texto: string;
  nota: number;
}

export interface Foto {
  arquivo: string;
  alt: string;
  legenda?: string;
  // O que manter quando o layout corta a foto (object-position), ex.: "50% 0%" = o alto da foto.
  foco?: string;
}

export interface Tema {
  fundo: string;
  superficie: string;
  texto: string;
  destaque: string;
  fontes: string;
}

export interface Ficha {
  slug: string;
  sufixo: string;
  placeId: string;
  modo: "previa" | "final";
  nicho: Nicho;
  layout: string;
  nome: string;
  rascunho: boolean;
  tema: Tema;
  textos: { titulo: string; subtitulo: string; sobre: string; chamada: string };
  servicos: Servico[];
  profissionais: Profissional[];
  depoimentos: Depoimento[];
  fotos: Foto[];
  contato: {
    telefone: string | null;
    whatsapp: string | null;
    instagram: string | null;
    endereco: string | null;
    mapsUrl: string | null;
    horarios: Horarios;
    horariosEstimados: boolean;
  };
  agenda: "simulada" | "demo";
  // Nota e total de avaliações do perfil no Google, mostrados no selo do Início.
  notaGoogle?: { nota: number; avaliacoes: number } | null;
}
