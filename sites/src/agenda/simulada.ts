import { digitosNacionais, ehCelular } from "../../../prospeccao/telefone.ts";
import type { Intervalo } from "../ficha/tipos.ts";
import {
  PASSO_MIN, agoraEmSaoPaulo, deMinutos, diaDaSemana, horariosLivres, inicioPermitido, paraMinutos, proximosDias, unirHorarios,
} from "./horarios.ts";
import type { DadosAgenda, FonteAgenda } from "./tipos.ts";

export interface Armazenamento {
  getItem(chave: string): string | null;
  setItem(chave: string, valor: string): void;
}
interface Marcado {
  data: string;
  inicio: string;
  fim: string;
  profissional: string | null;
  celular: string;
}

export const TAXA_OCUPACAO = 0.3;
export const LIMITE_POR_DIA = 2;
// Prévias e caderno dividem o domínio (e o armazenamento): a agenda só usa chaves previa:.
export const chaveDaPrevia = (slug: string) => `previa:${slug}:agendamentos`;

// FNV-1a de 32 bits: barato e estável, para a mesma prévia mostrar sempre a mesma agenda.
export function hash(texto: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < texto.length; i++) {
    h ^= texto.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

export const ocupadoFicticio = (slug: string, data: string, profissional: string | null, hora: string) =>
  hash(`${slug}|${data}|${profissional ?? "-"}|${hora}`) / 2 ** 32 < TAXA_OCUPACAO;

// Aba privada do Safari, site bloqueado ou cota cheia: a agenda segue na memória da página.
export function armazenamentoSeguro(obter: () => Armazenamento): Armazenamento {
  const memoria = new Map<string, string>();
  let real: Armazenamento | null = null;
  try {
    real = obter();
  } catch {
    real = null;
  }
  return {
    getItem(chave) {
      const local = memoria.get(chave);
      if (local !== undefined) return local;
      try {
        return real?.getItem(chave) ?? null;
      } catch {
        return null;
      }
    },
    setItem(chave, valor) {
      memoria.set(chave, valor);
      try {
        real?.setItem(chave, valor);
      } catch {}
    },
  };
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function criarFonteSimulada(o: { dados: DadosAgenda; armazenamento: Armazenamento; agora: () => Date }): FonteAgenda {
  const { dados } = o;
  const chave = chaveDaPrevia(dados.slug);
  const agendas: (string | null)[] = dados.profissionais.length ? dados.profissionais : [null];
  const duracao = (servico: string) => dados.servicos.find((s) => s.nome === servico)?.duracaoMin ?? null;
  const lerMarcados = (): Marcado[] => {
    try {
      const v: unknown = JSON.parse(o.armazenamento.getItem(chave) ?? "[]");
      return Array.isArray(v) ? (v as Marcado[]) : [];
    } catch {
      return [];
    }
  };

  function livresDe(agenda: string | null, data: string, duracaoMin: number): string[] {
    const minimo = inicioPermitido(data, o.agora());
    if (minimo === null) return [];
    const hoje = agoraEmSaoPaulo(o.agora()).data;
    if (!proximosDias(dados.horarios, hoje).some((d) => d.data === data && d.aberto)) return [];
    const funcionamento = dados.horarios[diaDaSemana(data)] ?? [];
    const ocupados: Intervalo[] = [];
    for (const [ini, fim] of funcionamento) {
      for (let t = paraMinutos(ini); t < paraMinutos(fim); t += PASSO_MIN) {
        if (ocupadoFicticio(dados.slug, data, agenda, deMinutos(t))) ocupados.push([deMinutos(t), deMinutos(Math.min(t + PASSO_MIN, paraMinutos(fim)))]);
      }
    }
    for (const m of lerMarcados()) if (m.data === data && m.profissional === agenda) ocupados.push([m.inicio, m.fim]);
    return horariosLivres({ funcionamento, ocupados, duracaoMin, minutoMinimo: minimo });
  }

  return {
    async horarios(q) {
      const d = duracao(q.servico);
      if (d === null) return [];
      const alvo = q.profissional === null ? agendas : agendas.filter((a) => a === q.profissional);
      return unirHorarios(alvo.map((a) => livresDe(a, q.data, d)));
    },
    async agendar(p) {
      const d = duracao(p.servico);
      const email = p.email?.trim();
      if (
        p.isca.trim() || p.nome.trim().length < 2 || !ehCelular(p.celular) || d === null ||
        (email && !EMAIL.test(email)) || (p.profissional !== null && !agendas.includes(p.profissional))
      ) return { ok: false, erro: "invalido" };
      const celular = digitosNacionais(p.celular);
      const marcados = lerMarcados();
      if (marcados.filter((m) => m.celular === celular && m.data === p.data).length >= LIMITE_POR_DIA) return { ok: false, erro: "limite" };
      const candidatas = p.profissional === null ? agendas : [p.profissional];
      const escolhida = candidatas.find((a) => livresDe(a, p.data, d).includes(p.hora));
      if (escolhida === undefined) return { ok: false, erro: "ocupado" };
      marcados.push({ data: p.data, inicio: p.hora, fim: deMinutos(paraMinutos(p.hora) + d), profissional: escolhida, celular });
      o.armazenamento.setItem(chave, JSON.stringify(marcados));
      return { ok: true, profissional: escolhida };
    },
  };
}
