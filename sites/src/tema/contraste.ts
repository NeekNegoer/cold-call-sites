// Contraste da WCAG 2: (L1 + 0,05) / (L2 + 0,05), com a luminância relativa de cada cor.
export const CONTRASTE_TEXTO = 4.5;
export const CONTRASTE_DESTAQUE = 3;

export const hexValido = (hex: string) => /^#[0-9a-fA-F]{6}$/.test(hex);

function canal(valor: number): number {
  const s = valor / 255;
  return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

export function luminancia(hex: string): number {
  const n = parseInt(hex.slice(1), 16);
  return 0.2126 * canal((n >> 16) & 255) + 0.7152 * canal((n >> 8) & 255) + 0.0722 * canal(n & 255);
}

export function contraste(a: string, b: string): number {
  const [claro, escuro] = [luminancia(a), luminancia(b)].sort((x, y) => y - x);
  return (claro + 0.05) / (escuro + 0.05);
}

export function corDoTextoSobre(fundo: string): "#000000" | "#ffffff" {
  return contraste(fundo, "#000000") >= contraste(fundo, "#ffffff") ? "#000000" : "#ffffff";
}
