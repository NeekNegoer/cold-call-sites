// Modo do build das prévias, escolhido pela variável PREVIAS_MODO:
// local = fichas + exemplos (npm run sites:local), publicar = só fichas, exemplos = só as fichas fictícias.
export type Modo = "local" | "publicar" | "exemplos";

export function modoAtual(valor = process.env.PREVIAS_MODO): Modo {
  if (valor === undefined || valor === "") return "local";
  if (valor === "local" || valor === "publicar" || valor === "exemplos") return valor;
  throw new Error(`PREVIAS_MODO inválido: ${valor} (use local, publicar ou exemplos)`);
}
