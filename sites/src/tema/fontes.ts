// Pares curados, servidos pelo próprio site via @fontsource (nada do Google Fonts).
export interface ParDeFontes {
  id: string;
  titulo: string;
  texto: string;
  pesoTitulo: number;
  pesoForte: number;
}

export const FONTES: readonly ParDeFontes[] = [
  { id: "playfair-source", titulo: "Playfair Display", texto: "Source Sans 3", pesoTitulo: 600, pesoForte: 600 },
  { id: "oswald-inter", titulo: "Oswald", texto: "Inter", pesoTitulo: 500, pesoForte: 600 },
  { id: "grotesk-inter", titulo: "Space Grotesk", texto: "Inter", pesoTitulo: 500, pesoForte: 600 },
  { id: "cormorant-nunito", titulo: "Cormorant Garamond", texto: "Nunito Sans", pesoTitulo: 600, pesoForte: 600 },
  { id: "bodoni-jost", titulo: "Bodoni Moda", texto: "Jost", pesoTitulo: 500, pesoForte: 500 },
  { id: "dmserif-dmsans", titulo: "DM Serif Display", texto: "DM Sans", pesoTitulo: 400, pesoForte: 600 },
];

export const parDeFontes = (id: string) => FONTES.find((f) => f.id === id);
