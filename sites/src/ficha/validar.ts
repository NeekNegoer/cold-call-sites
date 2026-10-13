import { DIAS, NICHOS, type Ficha, type Tema } from "./tipos.ts";
import { layoutsDoNicho } from "../tema/layouts.ts";
import { problemasDoTema } from "../tema/tema.ts";

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const SUFIXO = /^[a-z0-9]{4}$/;
const HHMM = /^(?:[01]\d|2[0-3]):[0-5]\d$|^24:00$/;
const ARQUIVO_FOTO = /^[\w-]+\.(?:jpe?g|png|webp)$/i;
const FOCO = /^(?:100|\d{1,2})% (?:100|\d{1,2})%$/;

type Obj = Record<string, unknown>;
const ehObj = (v: unknown): v is Obj => typeof v === "object" && v !== null && !Array.isArray(v);
const ehTexto = (v: unknown): v is string => typeof v === "string" && v.trim().length > 0;
const textoOuNulo = (v: unknown) => v === null || typeof v === "string";
const lista = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
const inteiroEntre = (v: unknown, min: number, max: number): v is number =>
  typeof v === "number" && Number.isInteger(v) && v >= min && v <= max;

function problemasDosHorarios(h: unknown, rascunho: boolean): string[] {
  if (!ehObj(h)) return ["contato.horarios precisa ter os dias de seg a dom"];
  const erros: string[] = [];
  let algumAberto = false;
  for (const d of DIAS) {
    const v = h[d];
    if (v === null) {
      if (!rascunho) erros.push(`contato.horarios.${d} está pendente: defina os intervalos, ou [] para fechado`);
      continue;
    }
    if (!Array.isArray(v)) {
      erros.push(`contato.horarios.${d} precisa ser uma lista de intervalos`);
      continue;
    }
    let fimAnterior = "";
    for (const iv of v) {
      const ok = Array.isArray(iv) && iv.length === 2 && HHMM.test(String(iv[0])) && HHMM.test(String(iv[1])) &&
        iv[1] > iv[0] && iv[0] >= fimAnterior;
      if (!ok) {
        erros.push(`contato.horarios.${d} tem intervalo inválido: ${JSON.stringify(iv)}`);
        break;
      }
      fimAnterior = iv[1];
      algumAberto = true;
    }
  }
  if (!rascunho && !algumAberto && erros.length === 0) erros.push("contato.horarios precisa de pelo menos um dia aberto");
  return erros;
}

// Confere a ficha inteira e junta todos os problemas numa mensagem só, para corrigir de uma vez.
export function validarFicha(dado: unknown, arquivo: string): Ficha {
  if (!ehObj(dado)) throw new Error(`Ficha inválida (${arquivo}):\n- a ficha precisa ser um objeto JSON`);
  const f = dado;
  const erros: string[] = [];
  const exigir = (ok: boolean, msg: string) => {
    if (!ok) erros.push(msg);
  };

  exigir(typeof f.slug === "string" && SLUG.test(f.slug), "slug precisa ter só letras minúsculas, números e hífens");
  exigir(typeof f.sufixo === "string" && SUFIXO.test(f.sufixo), "sufixo precisa ter 4 letras minúsculas ou números");
  exigir(ehTexto(f.placeId), "placeId é obrigatório");
  exigir(f.modo === "previa", f.modo === "final" ? "modo final ainda não existe: o B1 gera só prévias" : "modo precisa ser previa");
  const nicho = NICHOS.find((n) => n === f.nicho);
  exigir(nicho !== undefined, `nicho precisa ser ${NICHOS.join(" ou ")}`);
  if (nicho) {
    const ids = layoutsDoNicho(nicho).map((l) => l.id);
    exigir(ids.includes(String(f.layout)), `layout precisa ser um de: ${ids.join(", ")}`);
  }
  exigir(ehTexto(f.nome) && f.nome.length <= 120, "nome é obrigatório e tem no máximo 120 caracteres");
  exigir(typeof f.rascunho === "boolean", "rascunho precisa ser true ou false");

  const t = f.tema;
  if (ehObj(t) && ["fundo", "superficie", "texto", "destaque", "fontes"].every((k) => typeof t[k] === "string")) {
    erros.push(...problemasDoTema(t as unknown as Tema));
  } else {
    erros.push("tema precisa de fundo, superficie, texto, destaque e fontes");
  }

  const x = ehObj(f.textos) ? f.textos : {};
  for (const k of ["titulo", "subtitulo", "chamada"]) exigir(ehTexto(x[k]), `textos.${k} é obrigatório`);
  exigir(typeof x.sobre === "string", "textos.sobre precisa ser texto (pode ser vazio)");

  const servicos = lista(f.servicos);
  exigir(servicos.length >= 1 && servicos.length <= 12, "servicos precisa ter de 1 a 12 itens");
  const nomes = new Set<string>();
  servicos.forEach((s, i) => {
    const o = ehObj(s) ? s : {};
    if (!ehTexto(o.nome)) erros.push(`servicos[${i}].nome é obrigatório`);
    else if (nomes.has(o.nome)) erros.push(`servicos[${i}].nome repetido: ${o.nome}`);
    else nomes.add(o.nome);
    exigir(inteiroEntre(o.duracaoMin, 5, 480) && o.duracaoMin % 5 === 0, `servicos[${i}].duracaoMin precisa ser um inteiro de 5 a 480, múltiplo de 5`);
    if (o.preco !== undefined) {
      exigir(f.modo !== "previa", `servicos[${i}].preco não pode existir numa prévia: prévia nunca inventa preço`);
      exigir(typeof o.preco === "number" && o.preco > 0, `servicos[${i}].preco precisa ser um número maior que zero`);
    }
  });

  const profissionais = lista(f.profissionais);
  exigir(Array.isArray(f.profissionais) && profissionais.length <= 10, "profissionais precisa ser uma lista de até 10");
  profissionais.forEach((p, i) => {
    const o = ehObj(p) ? p : {};
    exigir(ehTexto(o.nome), `profissionais[${i}].nome é obrigatório`);
    exigir(o.foto === undefined || (typeof o.foto === "string" && ARQUIVO_FOTO.test(o.foto)), `profissionais[${i}].foto precisa ser um arquivo .jpg, .png ou .webp`);
  });

  const depoimentos = lista(f.depoimentos);
  exigir(Array.isArray(f.depoimentos) && depoimentos.length <= 6, "depoimentos precisa ser uma lista de até 6");
  depoimentos.forEach((d, i) => {
    const o = ehObj(d) ? d : {};
    exigir(ehTexto(o.autor), `depoimentos[${i}].autor é obrigatório`);
    exigir(ehTexto(o.texto) && o.texto.length <= 500, `depoimentos[${i}].texto é obrigatório e tem no máximo 500 caracteres`);
    exigir(inteiroEntre(o.nota, 1, 5), `depoimentos[${i}].nota precisa ser um inteiro de 1 a 5`);
  });

  const fotos = lista(f.fotos);
  exigir(Array.isArray(f.fotos) && fotos.length <= 12, "fotos precisa ser uma lista de até 12");
  fotos.forEach((ft, i) => {
    const o = ehObj(ft) ? ft : {};
    exigir(typeof o.arquivo === "string" && ARQUIVO_FOTO.test(o.arquivo), `fotos[${i}].arquivo precisa ser um arquivo .jpg, .png ou .webp`);
    exigir(ehTexto(o.alt), `fotos[${i}].alt é obrigatório`);
    exigir(o.legenda === undefined || typeof o.legenda === "string", `fotos[${i}].legenda precisa ser texto`);
    exigir(o.foco === undefined || (typeof o.foco === "string" && FOCO.test(o.foco)), `fotos[${i}].foco precisa ser "x% y%", de 0% a 100% (ex.: "50% 0%")`);
  });

  const c = ehObj(f.contato) ? f.contato : {};
  for (const k of ["telefone", "whatsapp", "instagram", "endereco", "mapsUrl"]) exigir(textoOuNulo(c[k]), `contato.${k} precisa ser texto ou null`);
  exigir(c.whatsapp == null || String(c.whatsapp).startsWith("https://wa.me/"), "contato.whatsapp precisa começar com https://wa.me/");
  exigir(c.instagram == null || /^@[\w.]+$/.test(String(c.instagram)), "contato.instagram precisa ser um @ válido");
  exigir(c.mapsUrl == null || String(c.mapsUrl).startsWith("https://"), "contato.mapsUrl precisa começar com https://");
  exigir(typeof c.horariosEstimados === "boolean", "contato.horariosEstimados precisa ser true ou false");
  erros.push(...problemasDosHorarios(c.horarios, f.rascunho === true));
  exigir(f.agenda === "simulada" || f.agenda === "demo", "agenda precisa ser simulada ou demo");

  if (erros.length) throw new Error(`Ficha inválida (${arquivo}):\n- ${erros.join("\n- ")}`);
  return dado as unknown as Ficha;
}
