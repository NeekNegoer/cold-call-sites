// Física da gaveta, nos termos que a Apple usa (WWDC 2018, Designing Fluid Interfaces):
// amortecimento 1 = sem quicar; resposta = segundos para chegar perto do alvo.

// Para onde o gesto iria se o dedo soltasse agora (mesma desaceleração da rolagem do iOS).
export function projetar(velocidade: number, desaceleracao = 0.998): number {
  return ((velocidade / 1000) * desaceleracao) / (1 - desaceleracao);
}

// Passou do limite: segue o dedo cada vez menos, em vez de parar seco.
export function elastico(excesso: number, dimensao: number, constante = 0.55): number {
  return (excesso * dimensao * constante) / (dimensao + constante * Math.abs(excesso));
}

export interface Mola {
  amortecimento: number;
  resposta: number;
}

// Um passo da mola (massa 1): rigidez e atrito saem do amortecimento e da resposta.
export function passoDaMola(x: number, v: number, alvo: number, mola: Mola, dt: number): [number, number] {
  const rigidez = (2 * Math.PI / mola.resposta) ** 2;
  const atrito = (4 * Math.PI * mola.amortecimento) / mola.resposta;
  const novaV = v + (-rigidez * (x - alvo) - atrito * v) * dt;
  return [x + novaV * dt, novaV];
}

export const parada = (x: number, v: number, alvo: number) => Math.abs(x - alvo) < 0.5 && Math.abs(v) < 5;

// Trajeto completo, quadro a quadro (60 por segundo), para testar e para animar sem biblioteca.
export function simularMola(o: { de: number; para: number; velocidade: number } & Mola, maxSegundos = 3): number[] {
  const trajeto: number[] = [];
  let x = o.de;
  let v = o.velocidade;
  for (let t = 0; t < maxSegundos * 60; t++) {
    for (let i = 0; i < 4; i++) [x, v] = passoDaMola(x, v, o.para, o, 1 / 240);
    trajeto.push(x);
    if (parada(x, v, o.para)) break;
  }
  trajeto[trajeto.length - 1] = o.para;
  return trajeto;
}
