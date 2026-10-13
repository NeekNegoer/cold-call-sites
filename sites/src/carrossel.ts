// Contas do carrossel de avaliações, separadas do DOM para poder testar.
export function indiceVisivel(rolagem: number, passo: number, total: number): number {
  if (passo <= 0 || total <= 0) return 0;
  return Math.min(total - 1, Math.max(0, Math.round(rolagem / passo)));
}

// As setas param nas pontas: no último cartão, "próxima" não volta para o primeiro.
export const proximoIndice = (atual: number, total: number, direcao: 1 | -1) => Math.min(total - 1, Math.max(0, atual + direcao));
