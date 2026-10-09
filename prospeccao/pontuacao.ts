export function pontuar(l: { avaliacoes: number; nota: number | null; celular: boolean; instagram: string | null }): number {
  const pontosAvaliacoes = (Math.min(l.avaliacoes, 100) / 100) * 50;
  const pontosNota =
    l.nota == null ? 0 : l.nota >= 4.5 ? 25 : l.nota >= 4.0 ? 15 : l.nota >= 3.5 ? 5 : 0;
  return Math.round(pontosAvaliacoes + pontosNota + (l.celular ? 15 : 0) + (l.instagram ? 10 : 0));
}
