import type { Lead } from "../tipos.ts";

export function leadDeTeste(parcial: Partial<Lead> = {}): Lead {
  return {
    placeId: "ChIJx",
    nome: "Barbearia X",
    nicho: "barbearia",
    termo: "barbearia",
    cidade: "São José",
    bairro: "Kobrasol",
    endereco: "R. A, 1 - Kobrasol, São José - SC",
    telefone: "+55 48 99999-0001",
    celular: true,
    whatsapp: "https://wa.me/5548999990001",
    instagram: "@x",
    site: null,
    classificacao: "sem_site",
    nota: 4.7,
    avaliacoes: 80,
    mapsUrl: "https://maps.example/x",
    categoria: "Barbearia",
    fechado: false,
    slug: "barbearia-x",
    score: 80,
    fase: "candidato",
    buscadoEm: "2026-10-09T19:00:00.000Z",
    lote: null,
    detalhes: null,
    ...parcial,
  };
}
