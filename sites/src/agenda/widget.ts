import { linkTelefone, rotuloDuracao } from "../ficha/exibir.ts";
import { resumoDoAgendamento, rotuloDia } from "./apresentar.ts";
import { agoraEmSaoPaulo, proximosDias } from "./horarios.ts";
import type { DadosAgenda, FonteAgenda } from "./tipos.ts";

type Passo = "servico" | "profissional" | "dia" | "hora" | "dados" | "fim";

const TITULOS: Record<Passo, string> = {
  servico: "Escolha o serviço",
  profissional: "Com quem?",
  dia: "Escolha o dia",
  hora: "Escolha o horário",
  dados: "Seus dados",
  fim: "Tudo certo",
};
const ERROS = {
  ocupado: "Esse horário acabou de ser ocupado. Escolha outro.",
  limite: "Este celular já tem 2 agendamentos neste dia.",
  invalido: "Confira o nome e o celular com DDD.",
} as const;

// Gaveta de agendamento. Tudo é montado com textContent: nenhum dado da ficha vira HTML.
export function iniciarAgendamento(dialog: HTMLDialogElement, fonte: FonteAgenda, dados: DadosAgenda, agora: () => Date): void {
  const passos: Passo[] = dados.profissionais.length > 0
    ? ["servico", "profissional", "dia", "hora", "dados", "fim"]
    : ["servico", "dia", "hora", "dados", "fim"];
  const estado = { servico: "", profissional: null as string | null, data: "", hora: "" };
  let atual: Passo = "servico";

  const el = <T extends HTMLElement>(seletor: string): T => {
    const achado = dialog.querySelector<T>(seletor);
    if (!achado) throw new Error(`Agenda sem ${seletor}`);
    return achado;
  };
  const titulo = el("[data-titulo]");
  const aviso = el("[data-aviso]");
  const voltar = el<HTMLButtonElement>("[data-voltar]");
  const form = el<HTMLFormElement>("[data-form]");
  const lista = (p: Passo) => el(`[data-lista="${p}"]`);
  const hoje = () => agoraEmSaoPaulo(agora()).data;

  function mostrar(p: Passo) {
    atual = p;
    for (const s of dialog.querySelectorAll<HTMLElement>("[data-passo]")) s.hidden = s.dataset.passo !== p;
    titulo.textContent = TITULOS[p];
    voltar.hidden = p === "servico" || p === "fim";
    aviso.textContent = "";
    dialog.querySelector<HTMLElement>(`[data-passo="${p}"] :is(button, input):not([disabled])`)?.focus();
  }
  const seguinte = () => passos[passos.indexOf(atual) + 1];

  function opcao(texto: string, detalhe: string, aoEscolher: () => void, desativada = false): HTMLButtonElement {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "opcao";
    b.disabled = desativada;
    const t = document.createElement("span");
    t.className = "opcao__texto";
    t.textContent = texto;
    b.append(t);
    if (detalhe) {
      const d = document.createElement("span");
      d.className = "opcao__detalhe";
      d.textContent = detalhe;
      b.append(d);
    }
    b.addEventListener("click", aoEscolher);
    return b;
  }
  function paragrafo(texto: string) {
    const p = document.createElement("p");
    p.className = "agenda__vazio";
    p.textContent = texto;
    return p;
  }

  function montarListas() {
    lista("servico").replaceChildren(...dados.servicos.map((s) => opcao(s.nome, rotuloDuracao(s.duracaoMin), () => {
      estado.servico = s.nome;
      mostrar(seguinte());
    })));
    if (dados.profissionais.length > 0) {
      lista("profissional").replaceChildren(
        opcao("Sem preferência", "Primeiro horário livre", () => {
          estado.profissional = null;
          mostrar(seguinte());
        }),
        ...dados.profissionais.map((nome) => opcao(nome, "", () => {
          estado.profissional = nome;
          mostrar(seguinte());
        })),
      );
    }
    const h = hoje();
    lista("dia").replaceChildren(...proximosDias(dados.horarios, h).map((d) => opcao(rotuloDia(d.data, h), d.aberto ? "" : "Fechado", () => {
      estado.data = d.data;
      mostrar("hora");
      void carregarHoras();
    }, !d.aberto)));
  }

  function falhou() {
    const contato = dados.whatsapp ?? (dados.telefone ? linkTelefone(dados.telefone) : null);
    aviso.replaceChildren(document.createTextNode("Não foi possível falar com a agenda agora. "));
    if (contato) {
      const a = document.createElement("a");
      a.href = contato;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      a.textContent = dados.whatsapp ? "Chame no WhatsApp." : "Ligue para nós.";
      aviso.append(a);
    }
  }

  async function carregarHoras(mensagem = "") {
    const alvo = lista("hora");
    alvo.replaceChildren(paragrafo("Carregando horários…"));
    try {
      const horas = await fonte.horarios({ servico: estado.servico, profissional: estado.profissional, data: estado.data });
      alvo.replaceChildren(...(horas.length
        ? horas.map((hora) => opcao(hora, "", () => {
          estado.hora = hora;
          el("[data-resumo]").textContent = resumoDoAgendamento({ ...estado, hoje: hoje() });
          mostrar("dados");
        }))
        : [paragrafo("Sem horários livres neste dia. Volte e escolha outro dia.")]));
      aviso.textContent = mensagem;
      alvo.querySelector("button")?.focus();
    } catch {
      falhou();
    }
  }

  form.addEventListener("submit", async (evento) => {
    evento.preventDefault();
    const campos = new FormData(form);
    const enviar = form.querySelector<HTMLButtonElement>('button[type="submit"]');
    if (enviar) enviar.disabled = true;
    try {
      const r = await fonte.agendar({
        servico: estado.servico,
        profissional: estado.profissional,
        data: estado.data,
        hora: estado.hora,
        nome: String(campos.get("nome") ?? ""),
        celular: String(campos.get("celular") ?? ""),
        email: String(campos.get("email") ?? "").trim() || undefined,
        isca: String(campos.get("site") ?? ""),
      });
      if (r.ok) {
        el("[data-confirmacao]").textContent = resumoDoAgendamento({ ...estado, profissional: r.profissional, hoje: hoje() });
        form.reset();
        mostrar("fim");
      } else if (r.erro === "ocupado") {
        mostrar("hora");
        await carregarHoras(ERROS.ocupado);
      } else {
        aviso.textContent = ERROS[r.erro];
      }
    } catch {
      falhou();
    } finally {
      if (enviar) enviar.disabled = false;
    }
  });

  voltar.addEventListener("click", () => {
    const anterior = passos[passos.indexOf(atual) - 1];
    if (anterior) mostrar(anterior);
  });
  for (const b of dialog.querySelectorAll<HTMLButtonElement>("[data-fechar]")) b.addEventListener("click", () => dialog.close());
  dialog.addEventListener("click", (e) => {
    if (e.target === dialog) dialog.close();
  });

  document.addEventListener("click", (e) => {
    const gatilho = (e.target as Element | null)?.closest<HTMLElement>("[data-agendar]");
    if (!gatilho) return;
    const servico = gatilho.dataset.agendar ?? "";
    Object.assign(estado, { servico: "", profissional: null, data: "", hora: "" });
    montarListas();
    dialog.showModal();
    if (servico && dados.servicos.some((s) => s.nome === servico)) {
      estado.servico = servico;
      mostrar(passos[1]);
    } else {
      mostrar("servico");
    }
  });
}
