import type { Dia, Horarios, Intervalo } from "../ficha/tipos.ts";

export const PASSO_MIN = 30;
export const ANTECEDENCIA_MIN = 60;
export const DIAS_A_FRENTE = 14;

export const paraMinutos = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};
export const deMinutos = (n: number) => `${String(Math.floor(n / 60)).padStart(2, "0")}:${String(n % 60).padStart(2, "0")}`;

// A agenda segue o horário de São Paulo, mesmo com o celular de quem agenda noutro fuso.
export function agoraEmSaoPaulo(agora: Date): { data: string; minutos: number } {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23",
    }).formatToParts(agora).map((x) => [x.type, x.value]),
  );
  return { data: `${p.year}-${p.month}-${p.day}`, minutos: Number(p.hour) * 60 + Number(p.minute) };
}

export function diaDaSemana(dataISO: string): Dia {
  const DIAS_DO_JS = ["dom", "seg", "ter", "qua", "qui", "sex", "sab"] as const;
  return DIAS_DO_JS[new Date(`${dataISO}T12:00:00Z`).getUTCDay()];
}

export function somarDias(dataISO: string, n: number): string {
  const d = new Date(`${dataISO}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export function proximosDias(horarios: Horarios, hoje: string, n = DIAS_A_FRENTE): { data: string; dia: Dia; aberto: boolean }[] {
  return Array.from({ length: n }, (_, i) => {
    const data = somarDias(hoje, i);
    const dia = diaDaSemana(data);
    return { data, dia, aberto: (horarios[dia] ?? []).length > 0 };
  });
}

// Primeiro minuto do dia em que dá para agendar: null num dia que já passou.
export function inicioPermitido(data: string, agora: Date, antecedenciaMin = ANTECEDENCIA_MIN): number | null {
  const a = agoraEmSaoPaulo(agora);
  if (data < a.data) return null;
  return data === a.data ? a.minutos + antecedenciaMin : 0;
}

export function horariosLivres(o: {
  funcionamento: Intervalo[];
  ocupados: Intervalo[];
  duracaoMin: number;
  minutoMinimo?: number;
  passoMin?: number;
}): string[] {
  const passo = o.passoMin ?? PASSO_MIN;
  const minimo = o.minutoMinimo ?? 0;
  const ocupados = o.ocupados.map(([a, b]) => [paraMinutos(a), paraMinutos(b)] as const);
  const livres: string[] = [];
  for (const [ini, fim] of o.funcionamento) {
    for (let t = paraMinutos(ini); t + o.duracaoMin <= paraMinutos(fim); t += passo) {
      if (t < minimo) continue;
      if (ocupados.some(([a, b]) => t < b && a < t + o.duracaoMin)) continue;
      livres.push(deMinutos(t));
    }
  }
  return livres;
}

export const unirHorarios = (listas: string[][]): string[] => [...new Set(listas.flat())].sort();
