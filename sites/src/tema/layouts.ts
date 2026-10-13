import type { Nicho, Tema } from "../ficha/tipos.ts";

export interface Variantes {
  inicio: "moldura" | "cheia" | "dividida" | "arco";
  servicos: "lista" | "cartoes";
  depoimentos: "citacao" | "cartoes";
  galeria: "grade" | "faixa" | "mosaico";
}

export interface DefinicaoLayout {
  id: string;
  nome: string;
  nicho: Nicho;
  temaPadrao: Tema;
  variantes: Variantes;
}

// Todos usam as mesmas seções; cada layout muda composição (variantes) e identidade (CSS em estilos/layouts/).
export const LAYOUTS: readonly DefinicaoLayout[] = [
  {
    id: "classica", nome: "Clássica", nicho: "barbearia",
    temaPadrao: { fundo: "#f5f5f7", superficie: "#ffffff", texto: "#1d1d1f", destaque: "#8a2a2a", fontes: "playfair-source" },
    variantes: { inicio: "moldura", servicos: "lista", depoimentos: "citacao", galeria: "grade" },
  },
  {
    id: "moderna-escura", nome: "Moderna escura", nicho: "barbearia",
    temaPadrao: { fundo: "#000000", superficie: "#1c1c1e", texto: "#f5f5f7", destaque: "#e3a857", fontes: "oswald-inter" },
    variantes: { inicio: "cheia", servicos: "cartoes", depoimentos: "cartoes", galeria: "faixa" },
  },
  {
    id: "minimal", nome: "Minimal", nicho: "barbearia",
    temaPadrao: { fundo: "#ffffff", superficie: "#f5f5f7", texto: "#1d1d1f", destaque: "#1f4d3a", fontes: "grotesk-inter" },
    variantes: { inicio: "dividida", servicos: "lista", depoimentos: "cartoes", galeria: "mosaico" },
  },
  {
    id: "suave", nome: "Suave", nicho: "estetica",
    temaPadrao: { fundo: "#fbf5f2", superficie: "#ffffff", texto: "#3a2a2a", destaque: "#a2525a", fontes: "cormorant-nunito" },
    variantes: { inicio: "arco", servicos: "cartoes", depoimentos: "citacao", galeria: "faixa" },
  },
  {
    id: "luxo", nome: "Luxo", nicho: "estetica",
    temaPadrao: { fundo: "#14110f", superficie: "#201b17", texto: "#f3ece4", destaque: "#c9a46a", fontes: "bodoni-jost" },
    variantes: { inicio: "cheia", servicos: "lista", depoimentos: "citacao", galeria: "mosaico" },
  },
  {
    id: "clean", nome: "Clean", nicho: "estetica",
    temaPadrao: { fundo: "#ffffff", superficie: "#f6f4f8", texto: "#1f1d24", destaque: "#6b4fa0", fontes: "dmserif-dmsans" },
    variantes: { inicio: "dividida", servicos: "cartoes", depoimentos: "cartoes", galeria: "grade" },
  },
];

export const layoutsDoNicho = (nicho: Nicho) => LAYOUTS.filter((l) => l.nicho === nicho);

export function layoutPorId(id: string): DefinicaoLayout {
  const l = LAYOUTS.find((x) => x.id === id);
  if (!l) throw new Error(`Layout desconhecido: ${id}`);
  return l;
}
