import type { Ficha } from "./tipos.ts";

// Ficha fictícia e válida, base dos testes.
export function fichaValida(parcial: Partial<Ficha> = {}): Ficha {
  return {
    slug: "barbearia-teste",
    sufixo: "ab12",
    placeId: "ChIJteste",
    modo: "previa",
    nicho: "barbearia",
    layout: "classica",
    nome: "Barbearia Teste",
    rascunho: false,
    tema: { fundo: "#f4efe6", superficie: "#ffffff", texto: "#1d1a16", destaque: "#7a1f1f", fontes: "playfair-source" },
    textos: { titulo: "Corte em dia", subtitulo: "Agende online.", sobre: "", chamada: "Agendar horário" },
    servicos: [{ nome: "Corte", duracaoMin: 30 }],
    profissionais: [],
    depoimentos: [],
    fotos: [{ arquivo: "1.jpg", alt: "Fachada" }],
    contato: {
      telefone: "+55 48 90000-0000",
      whatsapp: "https://wa.me/5548900000000",
      instagram: "@teste.exemplo",
      endereco: "Rua Exemplo, 1",
      mapsUrl: "https://www.google.com/maps",
      horarios: {
        seg: [["09:00", "19:00"]], ter: [["09:00", "19:00"]], qua: [["09:00", "19:00"]], qui: [["09:00", "19:00"]],
        sex: [["09:00", "19:00"]], sab: [["09:00", "17:00"]], dom: [],
      },
      horariosEstimados: false,
    },
    agenda: "simulada",
    ...parcial,
  };
}
