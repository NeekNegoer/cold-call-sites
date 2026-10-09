import type { Saldo } from "./apify.ts";

export function podeRodar(s: Saldo, tetoUsd: number): boolean {
  return s.limiteUsd - s.usadoUsd >= tetoUsd;
}

export function mensagemSemSaldo(s: Saldo, tetoUsd: number): string {
  const resta = Math.max(0, s.limiteUsd - s.usadoUsd);
  return `Saldo da Apify insuficiente: restam US$${resta.toFixed(2)} e o teto desta execução é US$${tetoUsd.toFixed(2)}. Espere o próximo ciclo mensal ou use um --teto-usd menor (mínimo US$${TETO_MINIMO_USD.toFixed(2)}).`;
}

export const TETO_MINIMO_USD = 0.5;

export function validarTeto(tetoUsd: number): void {
  if (!(tetoUsd >= TETO_MINIMO_USD)) {
    throw new Error(`O teto mínimo da Apify por execução é US$${TETO_MINIMO_USD.toFixed(2)} (recebido: ${tetoUsd}).`);
  }
}
