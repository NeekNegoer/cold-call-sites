export type Classificacao = "sem_site" | "so_rede" | "site_proprio";
export type Fase = "candidato" | "lote" | "detalhado";

export interface LeadBruto {
  placeId: string;
  nome: string;
  nicho: string;
  termo: string;
  cidade: string;
  bairro: string | null;
  endereco: string;
  telefone: string;
  celular: boolean;
  whatsapp: string | null;
  instagram: string | null;
  site: string | null;
  classificacao: Classificacao;
  nota: number | null;
  avaliacoes: number;
  mapsUrl: string;
  categoria: string | null;
  fechado: boolean;
}

export interface Detalhes {
  horarios: { dia: string; horas: string }[];
  coordenadas: { lat: number; lng: number } | null;
  reviews: { autor: string; texto: string; nota: number }[];
  fotos: string[];
  detalhadoEm: string;
}

export interface Lead extends LeadBruto {
  slug: string;
  score: number;
  fase: Fase;
  buscadoEm: string;
  lote: string | null;
  detalhes: Detalhes | null;
}
