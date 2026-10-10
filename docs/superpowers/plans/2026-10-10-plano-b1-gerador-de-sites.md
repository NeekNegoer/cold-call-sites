# Plano B1 — Gerador de sites — Plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Gerar, sob pedido, a prévia personalizada de um lead revisado (site de uma página com nome, fotos, avaliações, horário e agenda simulada), publicá-la num repositório privado com GitHub Pages e mostrar o link no caderno.

**Architecture:**
- **Projeto:** Astro 7 estático em `sites/`.
- **Lógica:** módulos TypeScript puros, testados com `node:test`:
  - horários do Google;
  - rascunho e validação da ficha;
  - contraste;
  - horários livres;
  - fonte simulada da agenda;
  - publicação.

  Os componentes `.astro` só montam a página.
- **Páginas:**
  - Cada ficha em `sites/src/fichas/<slug>.json` (fora do git) vira a página `/previas/<slug>-<sufixo>/`.
  - Cada ficha de exemplo, fictícia, vira uma página por layout, para comparar os layouts e testar.
- **Publicação:** o `previas:publicar`:
  1. gera o site numa pasta temporária;
  2. sincroniza o resultado no clone `sites/dist/` do repositório privado `NeekNegoer/previas`;
  3. grava `sites/publicadas.json`, que o `painel:construir` lê para preencher o botão Prévia.

**Tech Stack:**
- Node.js 24 (type stripping, `node:test`) e TypeScript 7 (`tsc --noEmit`).
- Astro 7.3.8, estático, com `astro:assets` e `sharp` para as fotos.
- Fontes `@fontsource/*`, servidas pelo próprio site.
- Widget feito com `<dialog>` e TypeScript, sem framework.
- Playwright 1.64.0 com WebKit, só em desenvolvimento.
- GitHub Pages num repositório privado (conta Pro).

**Spec:**
- B1: `docs/superpowers/specs/2026-10-10-plano-b1-gerador-de-sites-design.md`.
- Contexto: `docs/superpowers/specs/2026-10-09-cold-call-sites-design.md`, seções 2, 5.4 e 6.

**Branch:** `plano-b1`, criada a partir de `main`.

## Global Constraints

**Ambiente e versões**
- Node.js 24 ou mais novo. O TypeScript roda por type stripping, então:
  - só sintaxe apagável (sem `enum`, `namespace` ou parameter properties);
  - imports relativos com a extensão `.ts`;
  - tipos importados com `import type` ou `type` inline.
- Versões: `astro@7.3.8`, `playwright@1.64.0` e `@fontsource/*` 5.x.
- Se uma API do Astro usada aqui não existir na 7.3.8:
  1. confira os tipos instalados (`node_modules/astro/dist/types/public/config.d.ts`, `node_modules/astro/components/`);
  2. adapte mantendo o comportamento;
  3. registre a mudança no ledger.
- Todo comando que roda o Astro leva `ASTRO_TELEMETRY_DISABLED=1`.

**Limites com o Plano A**
- Em `prospeccao/`, só o `detalhar` muda (Task 1).
- O B1 importa de `prospeccao/` só `tipos.ts` (o tipo `Lead`), `armazem.ts` e `telefone.ts`. Nos testes, também `fixtures/lead.ts`.

**Fora do git**
- `sites/src/fichas/`, `sites/src/fotos/`, `sites/dist/`, `sites/.saida/`, `sites/.prints/` e `sites/publicadas.json`, além do que o `.gitignore` já cobre.
- As fichas de exemplo versionadas são fictícias: nenhum nome, telefone, endereço ou foto real.

**Endereços**
- `urlBase` = `https://neeknegoer.github.io/previas/`.
- Caminho de uma prévia: `<slug>-<sufixo>/`, com `sufixo` de 4 caracteres `[a-z0-9]`.
- Caminho de um exemplo: `<slug-do-exemplo>-<layout>/`. O slug do exemplo começa com `exemplo-`.

**Nichos, layouts e serviços**
- Layouts por nicho: `barbearia` tem `classica`, `moderna-escura` e `minimal`; `estetica` tem `suave`, `luxo` e `clean`.
- Serviços padrão, sem preço:
  - barbearia: Corte 30, Barba 30, Corte + barba 60, Sobrancelha 15;
  - estética: Design de sobrancelha 30, Design com henna 45, Brow lamination 60, Buço 15.
- Prévia nunca mostra preço: a validação recusa `preco` quando a ficha está em `modo: previa`.

**Contraste**
- Mínimo de 4,5:1 para:
  - texto × fundo;
  - texto × superfície;
  - texto do botão × destaque.
- Mínimo de 3:1 para destaque × fundo.
- O texto do botão é `#000000` ou `#ffffff`: o que contrastar mais com o destaque.

**Agenda**
- Passo de 30 min e antecedência de 60 min.
- Próximos 14 dias, contando hoje, no fuso America/Sao_Paulo.
- No máximo 2 agendamentos por celular por dia.
- Ocupação fictícia de 30%.
- Agendamentos guardados no `sessionStorage`, na chave `previa:<slug>:agendamentos`.

**Textos fixos**
- Faixa: "Prévia criada para <nome>. A agenda desta página é uma demonstração."
- Confirmação: "Agendamento de demonstração: nada foi marcado de verdade."
- O aviso de rascunho começa com "RASCUNHO".
- Crédito das fotos na prévia: "Fotos: Google Maps".

**Segurança das páginas**
- Nenhum script, estilo, fonte, imagem ou iframe de terceiros.
- Nenhum dado da ficha passa por `set:html`, `innerHTML` ou `insertAdjacentHTML`. O widget monta tudo com `textContent`.
- Nenhuma referência a chaves `caderno:`.
- Toda página leva `<meta name="robots" content="noindex, nofollow">` e `<meta name="referrer" content="no-referrer">`.
- Links externos com `rel="noopener noreferrer"`.

**Repositório das prévias**
- Privado.
- Os commits usam o mesmo `user.name` e `user.email` (noreply) do clone `painel/dist`.
- Nunca commitar caminhos absolutos com o usuário do macOS.

**Idioma:** textos para quem usa em português do Brasil.

### Desvios deliberados da spec (registre no ledger)

- **Sai o `robots.txt`.** Buscador só lê o `robots.txt` da raiz do domínio (`neeknegoer.github.io/robots.txt`), nunca o de `/previas/`. Quem protege é o `noindex` de cada página. A Task 15 corrige a spec.
- **O `.nojekyll` é gravado pelo `previas:publicar`.** O Vite pode pular arquivos que começam com ponto em `estaticos/`.
- **`agendar` devolve `{ ok: true, profissional }`.** É o profissional atribuído em "sem preferência", um acréscimo à interface da spec 9.
- **Regra extra de contraste:** destaque × fundo ≥ 3:1, para o botão se destacar do fundo.
- **Exemplos em todos os layouts:** cada ficha de exemplo vira uma página por layout do seu nicho (3 páginas), para comparar os layouts e testar o pior caso em todos.
- **`textos.sobre`** aparece logo abaixo do Início e some quando está vazio.
- **`modo: final` é recusado** na validação, porque o B1 só gera prévias.
- **Comparação dos layouts sem a skill `prototype`.** Ela só roda quando você a chama (`/prototype`). A comparação lado a lado usa as páginas de exemplo, uma por layout, com o critério da skill: cada layout diverge num eixo com nome e funciona por inteiro.

## Review Focus

- **Horário estranho no Google** (vira a meia-noite, texto livre, dia faltando): o rascunho marca o dia como pendente (`null`) e lista o problema na saída do `ficha`. A validação recusa `null` fora do rascunho, então nada vai para o ar com horário inventado. → testes nas Tasks 3 e 5.
- **Navegador sem `sessionStorage`** (aba privada do Safari, cota cheia): a agenda simulada continua funcionando na memória da página. → teste na Task 8.
- **Nome ou texto da ficha com `<`, `&` ou aspas:** aparece como texto, nunca como HTML. → teste de build na Task 9, com o pior caso.
- **Agendar perto do fim do dia, ou com o celular em outro fuso:** "hoje" e a antecedência de 60 min seguem São Paulo, e horário passado nunca aparece. → testes nas Tasks 7 e 8.
- **Push que falha no `previas:publicar`:** o erro aparece, `sites/publicadas.json` não muda, e a execução seguinte envia o commit que ficou para trás. → teste na Task 14.

## Mapa de arquivos

| Arquivo | Responsabilidade |
|---|---|
| `prospeccao/detalhar.ts`, `prospeccao/cli/detalhar.ts` | detalhar só os leads pedidos (Task 1) |
| `sites/astro.config.ts`, `sites/config.json`, `sites/tsconfig.json` | projeto Astro, `urlBase` |
| `sites/estaticos/icone.svg` | ícone (pasta pública do Astro) |
| `sites/nichos.json` | serviços, horário padrão e textos-base por nicho |
| `sites/src/modo.ts` | modo do build: `local`, `publicar` ou `exemplos` |
| `sites/src/construir.ts` | roda o `astro build` numa pasta escolhida |
| `sites/src/ficha/tipos.ts` | tipos da ficha, dias da semana, nichos |
| `sites/src/ficha/horarios.ts` | horários do Google → horários da ficha |
| `sites/src/ficha/validar.ts` | validação da ficha com mensagens claras |
| `sites/src/ficha/paginas.ts` | fichas e exemplos → lista de páginas |
| `sites/src/ficha/imagens.ts` | índice das fotos e fotos de cada ficha |
| `sites/src/ficha/rascunho.ts` | lead → rascunho da ficha (puro) |
| `sites/src/ficha/criar.ts` | `npm run ficha`: lê o lead, copia as fotos, grava a ficha |
| `sites/src/ficha/exibir.ts` | formatos de tela: dias, horários, duração, telefone, Instagram |
| `sites/src/ficha/fixtures.ts` | ficha válida para os testes |
| `sites/src/tema/contraste.ts`, `fontes.ts`, `layouts.ts`, `tema.ts` | contraste WCAG, pares de fontes, layouts e variantes, problemas de um tema |
| `sites/src/agenda/tipos.ts` | interface `FonteAgenda` e dados que o widget recebe |
| `sites/src/agenda/horarios.ts` | horários livres, dias, "agora" em São Paulo |
| `sites/src/agenda/simulada.ts` | fonte simulada (ocupação fictícia, `sessionStorage`) |
| `sites/src/agenda/apresentar.ts` | rótulos do widget e dados da agenda a partir da ficha |
| `sites/src/agenda/widget.ts` | comportamento da gaveta de agendamento (DOM) |
| `sites/src/conteudo.ts` | `import.meta.glob` das fichas, exemplos e fotos (só roda no Astro) |
| `sites/src/estilos/*.css`, `sites/src/estilos/layouts/*.css` | estilos base, seções, agenda e identidade de cada layout |
| `sites/src/layouts/Base.astro`, `Padrao.astro` | documento HTML e composição da prévia |
| `sites/src/components/secoes/*.astro`, `Agendar.astro` | seções e gaveta |
| `sites/src/pages/index.astro`, `[previa]/index.astro`, `[previa]/privacidade.astro` | rotas |
| `sites/src/exemplos/*.json`, `sites/src/exemplos/fotos/` | fichas fictícias (normal e pior caso) e fotos neutras |
| `sites/src/publicar.ts`, `sites/src/remover.ts` | publicar e tirar prévias do ar |
| `sites/cli/*.ts` | `ficha`, `publicar`, `remover`, `prints`, servidor local de teste |
| `sites/build.test.ts` | testes do build (HTML, CSS, segurança) |
| `sites/e2e/agendar.e2e.ts` | fluxo de agendamento no WebKit |
| `painel/construir.ts` | lê `sites/publicadas.json` e preenche `previaUrl` |

---

### Task 1: `detalhar` sob pedido

O comando para de detalhar o lote inteiro. Ele passa a receber os slugs que você pediu e só aceita leads que já estão no caderno. Spec: B1 seção 5 e spec principal 5.4.

**Files:**
- Modify: `prospeccao/detalhar.ts` (função `executarDetalhes`)
- Modify: `prospeccao/cli/detalhar.ts`
- Modify: `prospeccao/detalhar.test.ts` (troca os dois últimos testes)
- Modify: `README.md` (fluxograma, seção "3. Detalhar o lote", tabela de comandos, custos)

**Interfaces:**
- Produces: `executarDetalhes(o: { slugs: string[]; tetoUsd?: number }, deps): Promise<{ detalhados: string[]; semDados: string[]; jaDetalhados: string[] }>`. O `deps` não muda.
- Produces: `npm run detalhar -- <slug> [<slug>...] [--teto-usd 1]`.

- [ ] **Step 1: Write the failing tests**

Em `prospeccao/detalhar.test.ts`, apague os testes `"detalha só o lote; quem não voltou continua no lote"` e `"sem lote, não chama a Apify"` e cole no lugar:

```ts
function clienteQueAnota() {
  const chamadas = { saldo: 0, rodar: 0, entrada: {} as Record<string, unknown> };
  const cliente: ClienteApify = {
    saldo: async () => {
      chamadas.saldo++;
      return { limiteUsd: 5, usadoUsd: 1 };
    },
    rodar: async (input) => {
      chamadas.rodar++;
      chamadas.entrada = input;
      return { runId: "r7", itens: [detalhe] };
    },
  };
  return { cliente, chamadas };
}
const baixar = async (urls: string[], destino: string) => urls.map((_, i) => `${destino}/${i + 1}.jpg`);

test("detalha só os leads pedidos; quem não voltou continua no lote", async () => {
  const armazem = criarArmazem(mkdtempSync(join(tmpdir(), "cold-")));
  armazem.salvarLead(leadDeTeste({ slug: "um", placeId: "ChIJteste000000000000001", fase: "lote", score: 90 }));
  armazem.salvarLead(leadDeTeste({ slug: "dois", placeId: "ChIJdois", fase: "lote", score: 80 }));
  armazem.salvarLead(leadDeTeste({ slug: "tres", placeId: "ChIJtres", fase: "lote", score: 99 }));
  const { cliente, chamadas } = clienteQueAnota();
  const r = await executarDetalhes(
    { slugs: ["dois", "um", "um"] },
    { cliente, armazem, config, agora: () => new Date("2026-10-10T12:00:00Z"), baixar },
  );
  assert.deepEqual(chamadas.entrada.placeIds, ["ChIJdois", "ChIJteste000000000000001"]);
  assert.deepEqual(r, { detalhados: ["um"], semDados: ["dois"], jaDetalhados: [] });
  const um = armazem.listarLeads().find((l) => l.slug === "um");
  assert.equal(um?.fase, "detalhado");
  assert.deepEqual(um?.detalhes?.fotos, ["sites/public/fotos/um/1.jpg", "sites/public/fotos/um/2.jpg"]);
  assert.equal(um?.detalhes?.reviews.length, 2);
  assert.equal(armazem.listarLeads().find((l) => l.slug === "dois")?.fase, "lote");
  assert.equal(armazem.listarLeads().find((l) => l.slug === "tres")?.fase, "lote");
  assert.equal(armazem.lerUso()[0].comando, "detalhar");
  assert.ok(Math.abs(armazem.lerUso()[0].gastoEstimadoUsd - (0.006 + 2 * 0.0005 + 2 * 0.0005)) < 1e-9);
});

test("sem slug, slug desconhecido ou lead fora do caderno: recusa antes de chamar a Apify", async () => {
  const armazem = criarArmazem(mkdtempSync(join(tmpdir(), "cold-")));
  armazem.salvarLead(leadDeTeste({ slug: "um", fase: "lote" }));
  armazem.salvarLead(leadDeTeste({ slug: "cand", fase: "candidato" }));
  const { cliente, chamadas } = clienteQueAnota();
  const deps = { cliente, armazem, config, agora: () => new Date(), baixar };
  await assert.rejects(executarDetalhes({ slugs: [] }, deps), /npm run detalhar -- <slug>/);
  await assert.rejects(executarDetalhes({ slugs: ["um", "nao-existe"] }, deps), /Lead não encontrado: nao-existe/);
  await assert.rejects(executarDetalhes({ slugs: ["cand"] }, deps), /ainda não estão no caderno.*cand/i);
  assert.deepEqual(chamadas, { saldo: 0, rodar: 0, entrada: {} });
});

test("lead já detalhado não é pago de novo", async () => {
  const armazem = criarArmazem(mkdtempSync(join(tmpdir(), "cold-")));
  armazem.salvarLead(leadDeTeste({ slug: "um", fase: "detalhado" }));
  const { cliente, chamadas } = clienteQueAnota();
  const r = await executarDetalhes({ slugs: ["um"] }, { cliente, armazem, config, agora: () => new Date(), baixar });
  assert.deepEqual(r, { detalhados: [], semDados: [], jaDetalhados: ["um"] });
  assert.equal(chamadas.saldo + chamadas.rodar, 0);
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test prospeccao/detalhar.test.ts`
Expected: FAIL. A versão atual ignora `slugs`, detalha o lote pelo score e não devolve `jaDetalhados`.

- [ ] **Step 3: Implement**

Em `prospeccao/detalhar.ts`:
- acrescente `import type { Lead } from "./tipos.ts";` aos imports;
- troque a assinatura e o começo de `executarDetalhes`, até a linha `if (alvo.length === 0) ...`, por:

```ts
export async function executarDetalhes(
  o: { slugs: string[]; tetoUsd?: number },
  deps: {
    cliente: ClienteApify;
    armazem: Armazem;
    config: Config;
    agora: () => Date;
    baixar: (urls: string[], destinoRelativo: string) => Promise<string[]>;
  },
) {
  // Só quem você pediu: detalhar gasta crédito da Apify, então nada é detalhado em lote.
  const pedidos = [...new Set(o.slugs)];
  if (pedidos.length === 0) throw new Error("Diga quais leads detalhar: npm run detalhar -- <slug> [<slug>...]");
  const porSlug = new Map(deps.armazem.listarLeads().map((l) => [l.slug, l] as const));
  const desconhecidos = pedidos.filter((s) => !porSlug.has(s));
  if (desconhecidos.length) throw new Error(`Lead não encontrado: ${desconhecidos.join(", ")}`);
  const candidatos = pedidos.filter((s) => porSlug.get(s)?.fase === "candidato");
  if (candidatos.length) throw new Error(`Ainda não estão no caderno (rode npm run lote antes): ${candidatos.join(", ")}`);
  const jaDetalhados = pedidos.filter((s) => porSlug.get(s)?.fase === "detalhado");
  const alvo = pedidos.map((s) => porSlug.get(s)).filter((l): l is Lead => l?.fase === "lote");
  if (alvo.length === 0) return { detalhados: [] as string[], semDados: [] as string[], jaDetalhados };
```

No fim da função, troque `return { detalhados, semDados };` por `return { detalhados, semDados, jaDetalhados };`. O resto (teto, saldo, `rodar`, fotos, uso) fica igual.

Substitua `prospeccao/cli/detalhar.ts` inteiro por:

```ts
import { parseArgs } from "node:util";
import { fileURLToPath } from "node:url";
import { carregarConfig } from "../config.ts";
import { criarArmazem } from "../armazem.ts";
import { criarClienteApify } from "../apify.ts";
import { executarDetalhes } from "../detalhar.ts";
import { baixarFotos } from "../fotos.ts";

const { values, positionals } = parseArgs({ options: { "teto-usd": { type: "string" } }, allowPositionals: true });
if (positionals.length === 0) {
  console.error("Diga quais leads detalhar: npm run detalhar -- <slug> [<slug>...]");
  process.exit(1);
}
const token = process.env.APIFY_TOKEN;
if (!token) {
  console.error("Falta APIFY_TOKEN no arquivo .env (modelo em .env.example).");
  process.exit(1);
}
const raiz = fileURLToPath(new URL("../../", import.meta.url));
try {
  const r = await executarDetalhes(
    { slugs: positionals, tetoUsd: values["teto-usd"] ? Number(values["teto-usd"]) : undefined },
    {
      cliente: criarClienteApify(token),
      armazem: criarArmazem(raiz),
      config: carregarConfig(),
      agora: () => new Date(),
      baixar: (urls, destino) => baixarFotos(urls, destino, raiz),
    },
  );
  console.log(`Detalhados: ${r.detalhados.length} · sem dados: ${r.semDados.length}`);
  if (r.semDados.length) console.log(`Sem dados (continuam no lote): ${r.semDados.join(", ")}`);
  if (r.jaDetalhados.length) console.log(`Já estavam detalhados, nada foi gasto com eles: ${r.jaDetalhados.join(", ")}`);
} catch (e) {
  console.error((e as Error).message);
  process.exit(1);
}
```

- [ ] **Step 4: Run tests, typecheck and the command without spending anything**

Run: `npm test && npm run typecheck`
Expected: PASS.

Run: `npm run -s detalhar; echo "saída $?"`
Expected: `Diga quais leads detalhar: npm run detalhar -- <slug> [<slug>...]` e `saída 1`.

Run: `npm run -s detalhar -- nao-existe; echo "saída $?"`
Expected: `Lead não encontrado: nao-existe` e `saída 1`. A recusa vem antes de qualquer chamada à Apify.

- [ ] **Step 5: README**

Em `README.md`, no fluxograma de "Como funciona", troque `  L --> D[detalhar]` por `  C -->|você escolhe| D[detalhar]` e `  P --> C` por `  P -->|link| C`.

Substitua a seção inteira `### 3. Detalhar o lote` (título, bloco de código e parágrafo) por:

````markdown
### 3. Detalhar quem vai ganhar prévia

```bash
npm run detalhar -- barbearia-exemplo
```

Depois de revisar o lote no caderno (passo 4), você diz quais leads vão ganhar prévia, e só esses são detalhados: horário de funcionamento, coordenadas, até 5 avaliações e até 4 fotos, salvas em `sites/public/fotos/`. Custa cerca de US$0,01 por lead. Um lead que ainda não está no caderno é recusado, e um lead já detalhado não é cobrado de novo.
````

Na tabela de comandos, troque a linha do `detalhar` por:

```markdown
| `npm run detalhar -- <slug>` | busca avaliações, horário e fotos só dos leads pedidos |
```

Na tabela de custos, troque a linha da Apify por:

```markdown
| Apify | grátis até US$5 por mês; uma busca de uns 80 lugares custa cerca de US$0,32, e cada lead detalhado, cerca de US$0,01 |
```

- [ ] **Step 6: Commit**

```bash
git add prospeccao/detalhar.ts prospeccao/cli/detalhar.ts prospeccao/detalhar.test.ts README.md
git commit -m "feat(prospeccao): detail only the leads you ask for"
```

---

> **Formato a partir daqui (pedido do usuário em 2026-10-10, para economizar tokens):** cada tarefa lista arquivos, interfaces, casos de teste e critério de pronto. O código é escrito na execução, sempre com TDD: escreva os testes listados, veja-os falhar, implemente, veja-os passar, rode `npm test && npm run typecheck` e faça o commit.

### Task 2: Projeto Astro (dependências, modo, build, raiz vazia)

**Files:**
- Create:
  - `sites/astro.config.ts`, `sites/config.json`, `sites/tsconfig.json`
  - `sites/estaticos/icone.svg`
  - `sites/src/modo.ts`, `sites/src/construir.ts`, `sites/src/pages/index.astro`
  - Testes: `sites/src/modo.test.ts`, `sites/build.test.ts`
- Modify: `package.json`, `tsconfig.json`, `.gitignore`

**Passos:**
1. **Instalar as dependências:**
   ```bash
   npm i -D astro@7.3.8 sharp @fontsource/playfair-display @fontsource/source-sans-3 @fontsource/oswald @fontsource/inter @fontsource/space-grotesk @fontsource/cormorant-garamond @fontsource/nunito-sans @fontsource/bodoni-moda @fontsource/jost @fontsource/dm-serif-display @fontsource/dm-sans
   ```
   Se o npm acusar conflito de peer com o TypeScript 7, pare, registre e pergunte. Não use `--force`.
2. **Scripts do `package.json`:**
   - `test` também roda `"sites/**/*.test.ts"`.
   - `sites:local`: `ASTRO_TELEMETRY_DISABLED=1 astro dev --root sites`
   - `ficha`: `node sites/cli/ficha.ts`
   - `previas:publicar`: `node sites/cli/publicar.ts`
   - `previa:remover`: `node sites/cli/remover.ts`
   - `sites:prints`: `PLAYWRIGHT_BROWSERS_PATH=0 node sites/cli/prints.ts`
   - `sites:e2e`: `PLAYWRIGHT_BROWSERS_PATH=0 node --test "sites/e2e/*.e2e.ts"`
3. **`tsconfig.json` da raiz:** `include` ganha `"sites/src/**/*.ts"`, `"sites/cli/**/*.ts"`, `"sites/e2e/**/*.ts"` e `"sites/*.test.ts"`.
4. **`sites/tsconfig.json`:** estende `../tsconfig.json` e inclui `.astro/types.d.ts` e `src/**/*`. Serve só para o editor.
5. **`.gitignore`:** ganha `sites/src/fichas/`, `sites/src/fotos/`, `sites/dist/`, `sites/.saida/`, `sites/.prints/` e `sites/publicadas.json`.
6. **`sites/config.json`:** `{ "urlBase": "https://neeknegoer.github.io/previas/" }`.
7. **`astro.config.ts`:**
   - `site` e `base` vêm da `urlBase` (import do JSON);
   - `publicDir: "./estaticos"`;
   - `outDir: process.env.PREVIAS_SAIDA ?? "./.saida"`;
   - `trailingSlash: "always"`;
   - `build: { format: "directory", inlineStylesheets: "never" }`;
   - `devToolbar: { enabled: false }`;
   - `server: { host: "127.0.0.1", port: 4321 }`.

**Interfaces (Produces):**
- `type Modo = "local" | "publicar" | "exemplos"`.
- `modoAtual(valor = process.env.PREVIAS_MODO): Modo`. Sem valor (ou vazio), devolve `local`. Com valor inválido, lança `PREVIAS_MODO inválido: x (use local, publicar ou exemplos)`.
- `construirSites(o: { raiz: string; saida: string; modo: Modo }): void`. Roda `node_modules/.bin/astro build --root sites` com `ASTRO_TELEMETRY_DISABLED=1`, `PREVIAS_SAIDA` e `PREVIAS_MODO`. Se falhar, lança `O build das prévias falhou:` seguido do stdout e do stderr.
- `pages/index.astro`: `lang="pt-BR"`, `noindex, nofollow`, `no-referrer`, título "Prévias". Corpo vazio por enquanto; a Task 9 acrescenta a lista de links do modo `local`.

**Testes:**
- `modoAtual`: `undefined` e `""` dão `local`; os três valores válidos passam; `"x"` lança.
- `build.test.ts`: um `before` roda `construirSites` em pasta temporária, modo `exemplos`. A raiz gerada:
  - tem os metas `robots` e `referrer`;
  - não tem nenhum `<a `;
  - a saída não tem a pasta `fotos/`, mesmo com `sites/public/fotos/` existindo.

**Pronto quando:** `npm test`, `npm run typecheck` e `npm run sites:local` funcionam. Depois de conferir, encerre o servidor.

**Commit:** `feat(sites): scaffold the Astro project for previews`

### Task 3: Tipos da ficha e horários do Google

**Files:**
- Create: `sites/src/ficha/tipos.ts`, `sites/src/ficha/horarios.ts`
- Teste: `sites/src/ficha/horarios.test.ts`

**Interfaces (Produces):**
- Nichos e dias:
  - `type Nicho = "barbearia" | "estetica"`, `NICHOS`;
  - `type Dia = "seg" | "ter" | "qua" | "qui" | "sex" | "sab" | "dom"`, `DIAS` nessa ordem.
- Horários:
  - `type Intervalo = [inicio: string, fim: string]`, no formato `"HH:MM"`; o fim pode ser `"24:00"`;
  - `type Horarios = Record<Dia, Intervalo[] | null>`, onde `null` quer dizer pendente.
- Partes da ficha:
  - `Servico { nome; duracaoMin; preco? }`
  - `Profissional { nome; foto? }`
  - `Depoimento { autor; texto; nota }`
  - `Foto { arquivo; alt; legenda? }`
  - `Tema { fundo; superficie; texto; destaque; fontes }`
- `Ficha`: todos os campos da spec, seção 6 (`contato.horarios: Horarios`, `contato.horariosEstimados: boolean`, `agenda: "simulada" | "demo"`, `modo: "previa" | "final"`).
- `converterHorarios(google: { dia: string; horas: string }[]): { horarios: Horarios; pendentes: string[] } | null`. Com a lista vazia, devolve `null`.

**Regras:**
- O dia sai das 3 primeiras letras do nome, sem acento.
- `Fechado` e `Closed` viram `[]`.
- `Open 24 hours` e `Aberto 24 horas` viram `[["00:00","24:00"]]`.
- `H:MM to HH:MM`, com partes separadas por vírgula, vira um intervalo por parte. Fim `00:00` vira `24:00`.
- Viram `null` (pendente):
  - fim menor ou igual ao início;
  - intervalos que se sobrepõem;
  - texto que não segue nenhum desses formatos;
  - dia ausente.

**Testes:**
- **Semana completa:** almoço `09:00 to 12:00, 13:45 to 19:00`, `Open 24 hours`, `Fechado`, e `9:00` normalizado para `09:00`.
- **Pendentes:**
  - `18:00 to 02:00` dá `null`, com a pendência exata `seg: horário não reconhecido ("18:00 to 02:00")`;
  - texto livre dá `null`;
  - dia ausente dá a pendência `qui: sem horário no Google`.
- **Meia-noite:** `20:00 to 00:00` dá `[["20:00","24:00"]]`.
- **Sobreposição:** `09:00 to 13:00, 12:00 to 18:00` dá `null`.
- **Lista vazia:** `[]` dá `null`.

**Commit:** `feat(sites): convert Google opening hours into the site format`

### Task 4: Tema — contraste, fontes, layouts e variantes

**Files:**
- Create: `sites/src/tema/contraste.ts`, `fontes.ts`, `layouts.ts`, `tema.ts`
- Testes: `sites/src/tema/contraste.test.ts`, `tema.test.ts`

**Interfaces (Produces):**
- **Contraste:**
  - `hexValido(hex)` (formato `#rrggbb`), `luminancia(hex)`, `contraste(a, b)` (WCAG 2), `corDoTextoSobre(hex): "#000000" | "#ffffff"`;
  - `CONTRASTE_TEXTO = 4.5`, `CONTRASTE_DESTAQUE = 3`.
- **Fontes:**
  - `FONTES: { id; titulo; texto; pesoTitulo; pesoForte }[]` e `parDeFontes(id)`;
  - pares, com o peso do título e o peso forte:

    | id | Título | Texto | Peso título | Peso forte |
    |---|---|---|---|---|
    | `playfair-source` | Playfair Display | Source Sans 3 | 600 | 600 |
    | `oswald-inter` | Oswald | Inter | 500 | 600 |
    | `grotesk-inter` | Space Grotesk | Inter | 500 | 600 |
    | `cormorant-nunito` | Cormorant Garamond | Nunito Sans | 600 | 600 |
    | `bodoni-jost` | Bodoni Moda | Jost | 500 | 500 |
    | `dmserif-dmsans` | DM Serif Display | DM Sans | 400 | 600 |
- **Layouts:**
  - `Variantes { inicio: "moldura"|"cheia"|"dividida"|"arco"; servicos: "lista"|"cartoes"; depoimentos: "citacao"|"cartoes"; galeria: "grade"|"faixa"|"mosaico" }`;
  - `LAYOUTS: { id; nome; nicho; temaPadrao: Tema; variantes: Variantes }[]`, `layoutsDoNicho(n)` e `layoutPorId(id)` (lança se o id não existir).
- **Tema:** `problemasDoTema(t: Tema): string[]`. Aponta cor que não é hex, fontes desconhecidas e os quatro contrastes. Mensagem: `contraste texto × fundo é 1.61:1, abaixo de 4.5:1`.

| id | nicho | fundo | superfície | texto | destaque | fontes | início / serviços / depoimentos / galeria |
|---|---|---|---|---|---|---|---|
| classica | barbearia | #f4efe6 | #ffffff | #1d1a16 | #7a1f1f | playfair-source | moldura / lista / citacao / grade |
| moderna-escura | barbearia | #111111 | #1c1c1c | #f2f2f2 | #d4a24c | oswald-inter | cheia / cartoes / cartoes / faixa |
| minimal | barbearia | #ffffff | #f3f3f1 | #141414 | #1f4d3a | grotesk-inter | dividida / lista / cartoes / mosaico |
| suave | estetica | #fbf5f2 | #ffffff | #3a2a2a | #a2525a | cormorant-nunito | arco / cartoes / citacao / faixa |
| luxo | estetica | #14110f | #201b17 | #f3ece4 | #c9a46a | bodoni-jost | cheia / lista / citacao / mosaico |
| clean | estetica | #ffffff | #f6f4f8 | #1f1d24 | #6b4fa0 | dmserif-dmsans | dividida / cartoes / cartoes / grade |

**Testes:**
- **Valores de contraste:**
  - preto × branco = 21;
  - uma cor com ela mesma = 1;
  - `#767676` × branco = 4.54;
  - o cálculo é simétrico (a ordem das cores não muda o resultado).
- **Cor do texto do botão:** amarelo `#ffd400` pede texto preto; bordô `#7a1f1f` pede texto branco.
- **`problemasDoTema`:** `#cccccc` sobre `#ffffff` gera a mensagem com `1.61:1`.
- **Layouts:**
  - todo `temaPadrao` passa sem problemas;
  - cada nicho tem 3 layouts;
  - `layoutPorId("x")` lança.

**Commit:** `feat(sites): add contrast rules, font pairs and layout definitions`

### Task 5: Validação da ficha, páginas, imagens e fichas de exemplo

**Files:**
- Create: `sites/src/ficha/validar.ts`, `paginas.ts`, `imagens.ts`, `fixtures.ts`
- Testes: `validar.test.ts`, `paginas.test.ts`, `imagens.test.ts`, `sites/src/exemplos/exemplos.test.ts`
- Create: `sites/src/exemplos/{exemplo-barbearia,exemplo-estetica,exemplo-pior-barbearia,exemplo-pior-estetica}.json`
- Create: as fotos neutras em `sites/src/exemplos/fotos/<slug>/N.jpg`: 4 para a barbearia, 4 para a estética e 1 para o pior caso de estética. São degradês gerados uma vez com `sharp`, sem texto.

**Interfaces (Produces):**
- `validarFicha(dado: unknown, arquivo: string): Ficha`. Junta todos os erros numa mensagem só, no formato `Ficha inválida (<arquivo>):\n- ...`.
- `paginas(fichas: Record<string, unknown>, exemplos: Record<string, unknown>, modo: Modo): { caminho: string; ficha: Ficha }[]`.
- `indexarFotos<T>(modulos: Record<string, { default: T }>): Map<string, T>`, com chave `pasta/arquivo`.
- `resolverImagens<T>(ficha, indice): { fotos: (Foto & { imagem: T })[]; profissionais: (Profissional & { imagem: T | null })[] }`.
- `fichaValida(parcial?)` nas fixtures, com dados fictícios.

**Regras da validação:**
- **Identificação:**
  - `slug` em kebab-case e `sufixo` com 4 caracteres `[a-z0-9]`;
  - `placeId` preenchido;
  - `modo` só pode ser `previa` (`final` dá `modo final ainda não existe: o B1 gera só prévias`);
  - `nicho` válido e `layout` desse nicho;
  - `nome` com até 120 caracteres;
  - `rascunho` booleano.
- **Tema e textos:**
  - `tema` passa por `problemasDoTema`;
  - em `textos`, título, subtítulo e chamada são obrigatórios, e `sobre` é texto (pode ser vazio).
- **Serviços:**
  - de 1 a 12, com nomes únicos;
  - duração inteira de 5 a 480 minutos, em múltiplos de 5;
  - `preco` proibido em prévia.
- **Profissionais, depoimentos e fotos:**
  - até 10 profissionais;
  - até 6 depoimentos, com texto de até 500 caracteres e nota inteira de 1 a 5;
  - até 12 fotos, com `arquivo` no formato `[\w-]+\.(jpe?g|png|webp)` e `alt` preenchido.
- **Contato:**
  - os campos são texto ou `null`;
  - o WhatsApp começa com `https://wa.me/`, o Instagram com `@` e o `mapsUrl` com `https://`.
- **Horários:**
  - todos os dias presentes;
  - `null` só é aceito no rascunho;
  - intervalos válidos, em ordem e sem sobreposição;
  - fora do rascunho, pelo menos um dia aberto.
- **Agenda:** `simulada` ou `demo`.

**Regras de `paginas`:**
- **Fichas:** cada uma vira `<slug>-<sufixo>`. O arquivo precisa se chamar `<slug>.json`, e o prefixo `exemplo-` é proibido.
- **Exemplos:** cada um vira uma página por layout do nicho, `<slug>-<layout>`, com o tema padrão do layout. O prefixo `exemplo-` é obrigatório.
- **Modos:** `publicar` ignora os exemplos, e `exemplos` ignora as fichas.
- **Saída:** caminho duplicado dá erro. A lista sai ordenada pelo caminho.

**Exemplos** (todos fictícios, `rascunho: false`):
- **Normais:** "Barbearia Modelo" (2 profissionais, 3 depoimentos, 4 fotos, almoço na quarta) e "Studio Modelo Sobrancelhas" (1 profissional).
- **Pior caso de barbearia:**
  - nome com cerca de 95 caracteres, incluindo `&`, aspas e `<Desde 1987>`;
  - 6 serviços com nomes longos, nenhum profissional e 1 depoimento de 300 caracteres;
  - nenhuma foto;
  - telefone fixo `+55 48 3000-0000`, sem WhatsApp, Instagram ou Maps, e endereço longo;
  - `horariosEstimados: true`.
- **Pior caso de estética:** nome com ✨ e "Wiśniewska-Kowalczyk", 1 foto e `sobre` vazio.
- **Celular dos exemplos:** `+55 48 90000-0000`.

**Testes:**
- **Validação:**
  - uma ficha válida passa;
  - os erros aparecem juntos, com o nome do arquivo;
  - preço em prévia é recusado;
  - layout de outro nicho é recusado;
  - dia `null` passa no rascunho e é recusado fora dele;
  - `modo: final` é recusado;
  - intervalo sobreposto é recusado;
  - um valor que não é objeto é recusado.
- **`paginas`:** caminho, modos, prefixo, nome do arquivo e duplicado.
- **`resolverImagens`:** foto ausente dá `<slug>: foto 3.jpg não encontrada em sites/src/fotos/<slug>/`.
- **Exemplos:** os 4 validam, geram 12 páginas, e todas as fotos referenciadas existem no disco.

**Commit:** `feat(sites): validate fichas and add fictional example fichas`

### Task 6: Rascunho da ficha e comando `ficha`

**Files:**
- Create: `sites/nichos.json`, `sites/src/ficha/rascunho.ts`, `sites/src/ficha/criar.ts`, `sites/cli/ficha.ts`
- Testes: `rascunho.test.ts`, `criar.test.ts`

**Interfaces (Produces):**
- `abreviarAutor(nome)`:
  - "Carlos Medeiros Silva" vira "Carlos S.";
  - um nome sozinho fica igual;
  - nome vazio vira "Cliente do Google".
- `cortarTexto(texto, max = 300)`: junta os espaços. Se passar do limite, corta no fim de uma palavra, tira a pontuação final e põe `…`.
- `escolherDepoimentos(reviews)`: só nota 4 ou mais e com texto. Ordena por nota e depois pelo texto mais longo, e fica com até 5.
- `rascunhoDaFicha(lead: Lead, o: { nichos; sufixo; fotos: string[] }): { ficha: Ficha; pendencias: string[] }`:
  - usa o primeiro layout do nicho e o tema dele;
  - os textos do nicho recebem `{nome}`, `{lugar}` (bairro, ou a cidade quando não há bairro) e `{cidade}`;
  - `profissionais: []`, `agenda: "simulada"`, `rascunho: true`;
  - sem horário, usa o `horarioPadrao`, marca `horariosEstimados: true` e acrescenta uma pendência;
  - nicho desconhecido lança erro.
- `sortearSufixo()`: 4 caracteres de `[a-z0-9]`, sorteados com `crypto.getRandomValues`.
- `criarFicha({ raiz, slug, sortear? }): { arquivo; ficha; pendencias }`:
  - lê o lead com `criarArmazem`;
  - lê `nichos.json` pelo caminho do próprio módulo;
  - recusa lead inexistente e fase diferente de `detalhado` (mensagem pede `npm run detalhar -- <slug>`);
  - recusa ficha já existente (mensagem `Já existe sites/src/fichas/<slug>.json. Para recomeçar, apague o arquivo.`);
  - copia para `sites/src/fotos/<slug>/` as fotos que existem; foto que falta vira pendência;
  - grava o JSON formatado.
- CLI: `npm run ficha <slug>` mostra o arquivo, o layout, quantas fotos e depoimentos, as pendências e o próximo passo.

**`nichos.json`:**
- serviços da seção Global Constraints;
- `horarioPadrao`: barbearia de segunda a sexta 09–19 e sábado 09–17; estética de segunda a sexta 09–19 e sábado 09–14; domingo fechado nos dois;
- textos-base:
  - título "Seu corte em dia em {lugar}" (barbearia) ou "Sobrancelhas bem feitas em {lugar}" (estética);
  - subtítulo "Escolha o serviço e o horário e agende em menos de um minuto.";
  - sobre "{nome} atende em {lugar}, {cidade}. Agende online, a qualquer hora.";
  - chamada "Agendar horário".

**Testes:**
- casos de `abreviarAutor` e de `cortarTexto`: curto, longo, não corta no meio de palavra;
- `escolherDepoimentos` filtra, ordena e limita;
- o rascunho de um lead fictício com horários e 5 reviews passa em `validarFicha`;
- sem horário, entra o padrão, com `horariosEstimados` e a pendência;
- bairro `null` usa a cidade;
- nicho desconhecido lança erro;
- `criarFicha` numa raiz temporária com 2 fotos e 1 ausente: copia 2, gera a pendência e usa o sufixo injetado;
- as três recusas não sobrescrevem nada;
- `sortearSufixo` segue a regex em 100 sorteios.

**Commit:** `feat(sites): draft a ficha from a detailed lead`

### Task 7: Horários livres

**Files:**
- Create: `sites/src/agenda/horarios.ts`
- Teste: `horarios.test.ts`

**Interfaces (Produces):**
- Constantes: `PASSO_MIN = 30`, `ANTECEDENCIA_MIN = 60`, `DIAS_A_FRENTE = 14`.
- Conversões: `paraMinutos`, `deMinutos`, `somarDias(dataISO, n)`.
- `agoraEmSaoPaulo(agora: Date): { data: string; minutos: number }`, com `Intl` em `America/Sao_Paulo` e `hourCycle: "h23"`.
- `diaDaSemana(dataISO): Dia`.
- `proximosDias(horarios, hoje, n = 14): { data; dia; aberto }[]`, com `null` contado como fechado.
- `inicioPermitido(data, agora): number | null`:
  - dia já passado: `null`;
  - hoje: minutos de agora + 60;
  - dia futuro: 0.
- `horariosLivres({ funcionamento, ocupados, duracaoMin, minutoMinimo?, passoMin? }): string[]`.
- `unirHorarios(listas): string[]`: une as listas sem repetir e ordena.

**Testes (resultados exatos):**
- **09–12, 30 min:** 09:00, 09:30, 10:00, 10:30, 11:00, 11:30.
- **09–12, 60 min:** 09:00 a 11:00.
- **Ocupado 10:00–10:30:**
  - com 30 min, só o 10:00 sai;
  - com 60 min, saem 09:30 e 10:00.
- **Almoço:** com 09–12 e 13:45–15:00, a segunda parte dá só 13:45 e 14:15.
- **Mínimo 610:** com `minutoMinimo = 610`, a lista começa em 10:30.
- **Casos vazios:** dia fechado (`[]`) e serviço maior que o funcionamento dão `[]`.
- **24 horas:** dá 48 horários, o último às 23:30.
- **`agoraEmSaoPaulo`:** `2026-10-10T02:30Z` dá `{ data: "2026-10-09", minutos: 1410 }`.
- **`diaDaSemana`:** `2026-10-10` é `sab`.
- **`proximosDias`:** a partir de `2026-10-10` são 14 dias; o domingo `2026-10-11` vem fechado, e o último é `2026-10-23`.
- **`inicioPermitido`:** com agora `2026-10-12T12:00Z`, hoje dá 600, amanhã dá 0 e ontem dá `null`.

**Commit:** `feat(sites): compute free booking slots`

### Task 8: Fonte simulada da agenda

**Files:**
- Create: `sites/src/agenda/tipos.ts`, `sites/src/agenda/simulada.ts`
- Teste: `simulada.test.ts`

**Interfaces (Produces):**
- Tipos:
  - `ConsultaHorarios { servico; profissional: string | null; data }`;
  - `PedidoAgendamento` (a consulta mais `hora`, `nome`, `celular`, `email?` e `isca`);
  - `RespostaAgendamento = { ok: true; profissional: string | null } | { ok: false; erro: "ocupado" | "limite" | "invalido" }`;
  - `FonteAgenda { horarios(q): Promise<string[]>; agendar(p): Promise<RespostaAgendamento> }`;
  - `DadosAgenda { slug; servicos: { nome; duracaoMin }[]; profissionais: string[]; horarios: Horarios; whatsapp; telefone }`.
- Funções e constantes:
  - `TAXA_OCUPACAO = 0.3`, `LIMITE_POR_DIA = 2`;
  - `chaveDaPrevia(slug)` devolve `previa:<slug>:agendamentos`;
  - `hash(texto)`, FNV-1a de 32 bits;
  - `ocupadoFicticio(slug, data, profissional, hora)`.
- `armazenamentoSeguro(obter: () => Armazenamento): Armazenamento`:
  - guarda na memória da página e também no armazenamento real;
  - na leitura, prefere a memória;
  - nunca lança, nem se o `obter` lançar.
- `criarFonteSimulada({ dados, armazenamento, agora }): FonteAgenda`.

**Regras:**
- **Agendas:** os profissionais, ou `[null]` quando não há nenhum.
- **Horários livres** = `horariosLivres` sobre:
  - o funcionamento do dia;
  - os blocos de 30 minutos ocupados de forma fictícia;
  - os agendamentos já feitos naquela agenda;
  - o mínimo vindo de `inicioPermitido`.

  Dá vazio para dia fechado, dia fora dos 14, dia passado e serviço desconhecido. "Sem preferência" une os horários de todas as agendas.
- **Agendar**, verificações em ordem:
  1. `invalido`: campo isca preenchido, nome com menos de 2 caracteres, número que não é celular (`ehCelular`), e-mail malformado, profissional ou serviço desconhecido;
  2. `limite`: o celular já tem 2 agendamentos no dia;
  3. `ocupado`: nenhuma agenda candidata tem a hora livre;
  4. se passou por tudo, grava o agendamento e devolve o profissional atribuído (o primeiro livre).

**Testes:** com agora = `2026-10-12T12:00Z` (segunda, 09:00 em São Paulo), 2 profissionais e terça `2026-10-13`:
- **Ocupação fictícia:** é fixa (a mesma chamada dá o mesmo resultado) e fica entre 22% e 38% numa amostra de 780 horários.
- **Agendar com profissional:** o horário some da lista dele.
- **Sem preferência:** o primeiro pedido vai para Ana, o segundo para Bruno, o terceiro dá `ocupado`, e a hora some da lista unida.
- **Limite:** o 3º agendamento do mesmo celular no dia dá `limite`.
- **Inválidos:** seis casos dão `invalido`.
- **Listas vazias:** domingo, dia fora dos 14, ontem e serviço desconhecido.
- **Hoje:** todos os horários são 10:00 ou mais tarde.
- **Sem profissionais:** a resposta traz `profissional: null`.
- **Armazenamento:**
  - `obter` que lança e `setItem` que lança: o agendamento continua valendo na página;
  - só aparecem chaves `previa:`.

**Commit:** `feat(sites): simulated booking source for previews`

### Task 9: Página da prévia — base, seções, rotas e privacidade

**Files:**
- Create:
  - `sites/src/ficha/exibir.ts` (teste: `exibir.test.ts`)
  - `sites/src/conteudo.ts`
  - `sites/src/estilos/base.css`, `secoes.css`
  - `sites/src/layouts/Base.astro`, `Padrao.astro`
  - `sites/src/components/secoes/{Faixa,Inicio,Servicos,Equipe,Depoimentos,Galeria,Localizacao,Rodape}.astro`
  - `sites/src/pages/[previa]/index.astro`, `[previa]/privacidade.astro`
- Modify: `sites/src/pages/index.astro`, `sites/build.test.ts`

**Interfaces (Produces):**
- `exibir.ts`:
  - `NOMES_DIAS`.
  - `formatarIntervalos(iv)`:
    - `null` dá "A confirmar";
    - `[]` dá "Fechado";
    - 24 horas dá "24 horas";
    - os demais dão `09:00 – 12:00 · 13:45 – 19:00`.
  - `linhasDeHorario(h)`.
  - `rotuloDuracao(min)`: "30 min", "1 h", "1 h 30".
  - `linkInstagram(@x)`.
  - `telefoneLegivel(tel)`: `(48) 99999-0000` ou `(48) 3000-0000`.
  - `linkTelefone(tel)`.
- `conteudo.ts`:
  - `/// <reference types="vite/client" />`;
  - `caminhosEstaticos()`: faz `import.meta.glob` das fichas, dos exemplos e das fotos (os dois diretórios) e devolve `{ params: { previa }, props: { ficha, imagens } }[]` para o modo atual;
  - se o `tsc` não aceitar os tipos do Vite ou do Astro neste arquivo, exclua só ele do `tsconfig` da raiz e registre.

**Decisões:**
- **CSS:**
  - Todo o CSS é global, em arquivos importados no `Base.astro`. Cada layout sobrescreve com seletores `[data-layout="<id>"]`.
  - O tema vira variáveis no `<body>`: `--cor-fundo`, `--cor-superficie`, `--cor-texto`, `--cor-destaque`, `--cor-sobre-destaque`, `--fonte-titulo`, `--fonte-texto`, `--peso-titulo` e `--peso-forte`.
  - Cada `<body>` leva `data-layout`.
- **Fontes:** `@fontsource/<nome>/latin-<peso>.css`, nos pesos da Task 4, importadas no `Base.astro`.
- **Fotos:**
  - Início: `<Picture>` em webp, larguras 480, 800 e 1200, `loading="eager"`.
  - Galeria: `<Image>` com larguras 400 e 800, lazy. A galeria mostra as fotos menos a principal e leva o crédito "Fotos: Google Maps" em prévia.
- **Ordem das seções:**
  1. aviso de rascunho;
  2. faixa;
  3. dentro de `<main>`: Início (com o `sobre` logo abaixo), Serviços, Equipe, Depoimentos, Galeria e Localização;
  4. rodapé.

  As seções somem como na spec, seção 8. A Localização some quando não há endereço, link do Maps nem horário.
- **Agendar:** botões `data-agendar` no Início, em cada serviço (`data-agendar="<nome do serviço>"`) e no rodapé.
- **Horário de hoje:** um script marca a linha do dia com `aria-current="date"`, usando `agoraEmSaoPaulo` e `diaDaSemana`.
- **Privacidade:** a página explica:
  - que esta é uma prévia;
  - que a agenda é simulada e nada sai do navegador;
  - de onde vêm as avaliações (nome do autor abreviado) e as fotos;
  - que não há cookies nem scripts de terceiros;
  - como pedir a retirada.
- **Raiz:** no modo `local`, `pages/index.astro` lista os links de todas as páginas.

**Testes de build** (no `build.test.ts`, modo `exemplos`):
- **Páginas:** as 12 páginas de exemplo e as 12 de privacidade existem.
- **Cada página de exemplo normal:**
  - `data-layout` certo e as 4 classes de variante;
  - ids `servicos`, `equipe`, `depoimentos`, `galeria` e `localizacao`;
  - exatamente um `<h1`, `lang="pt-BR"` e a faixa de prévia;
  - nenhum aviso "RASCUNHO".
- **Pior caso de barbearia, em todos os layouts:**
  - sem galeria, equipe, `class="horarios"` nem `<img`;
  - com depoimentos e localização;
  - contém `&lt;Desde 1987&gt;` e não contém `<Desde 1987>`.
- **Recursos de fora:** nenhum `src`, `href` ou `srcset` de `script`, `link`, `img`, `source` ou `iframe` fora de `/previas/` ou `data:`, e nenhum `url(http` ou `url(//` em CSS ou HTML.
- **Caderno:** nenhum `caderno:` em `.html` ou `.js`.
- **Imagens:** todo `<img` tem `alt` preenchido.

Testes unitários de `exibir.ts` para os formatos acima.

**Pronto quando:** `npm run sites:local` mostra os 12 exemplos em `http://127.0.0.1:4321/previas/`.

**Commit:** `feat(sites): render the preview page with all sections`

### Task 10: Widget de agendamento

**Files:**
- Create: `sites/src/agenda/apresentar.ts` (teste: `apresentar.test.ts`), `sites/src/agenda/widget.ts`, `sites/src/components/Agendar.astro`, `sites/src/estilos/agenda.css`
- Modify: `Padrao.astro` (inclui `<Agendar>`), `sites/build.test.ts`

**Interfaces (Produces):**
- `rotuloDia(data, hoje)`: "Hoje", "Amanhã" ou `sáb, 11/10`.
- `resumoDoAgendamento({ servico, data, hora, profissional, hoje })`.
- `dadosDaAgenda(ficha): DadosAgenda`.
- `iniciarAgendamento(dialog, fonte, dados, agora): void`.

**Comportamento:**
- **Passos:** serviço → profissional ("Sem preferência" + nomes; passo pulado sem profissionais) → dia (14 botões, os fechados desativados) → hora → dados → fim.
- **Navegação:**
  - Voltar e Fechar;
  - clicar no fundo fecha;
  - Esc fecha (nativo do `<dialog>`);
  - um `data-agendar` com nome de serviço abre a gaveta já no passo seguinte ao serviço.
- **Montagem:** tudo com `createElement` e `textContent`.
- **Envio:** o botão fica desativado durante o envio.
- **Respostas:**
  - `ocupado`: volta para a hora, recarrega e mostra "Esse horário acabou de ser ocupado. Escolha outro.";
  - `limite`: "Este celular já tem 2 agendamentos neste dia.";
  - `invalido`: "Confira o nome e o celular com DDD.";
  - exceção da fonte: aviso com link para o WhatsApp, ou `tel:` quando não há WhatsApp.
- **Fim:** mostra o resumo e "Agendamento de demonstração: nada foi marcado de verdade."
- **Marcação (`Agendar.astro`):**
  - `<dialog class="agenda" data-agenda={JSON.stringify(dados)}>` com `.agenda__caixa`;
  - pontos de ligação: `data-titulo`, `data-aviso` (`role="status"`), `data-voltar`, `data-fechar`, `data-lista="servico|profissional|dia|hora"`, `data-form`, `data-resumo` e `data-confirmacao`;
  - campos `nome`, `celular` (`type="tel"`) e `email`, mais a isca `site`, escondida fora da tela e com `tabindex="-1"`.
- **Script:** usa `armazenamentoSeguro(() => window.sessionStorage)` e `criarFonteSimulada`.
- **CSS:**
  - o `<dialog>` cobre a tela inteira com fundo transparente;
  - a caixa fica embaixo, como gaveta, com menos de 720 px de largura, e centralizada como janela a partir de 720 px;
  - campos com 16 px de fonte e alvos de toque de 48 px;
  - `prefers-reduced-motion` respeitado;
  - `html:has(dialog[open]) { overflow: hidden }`.

**Testes:**
- unitários de `apresentar.ts`;
- build:
  - o `<dialog class="agenda"` existe;
  - o `data-agenda`, decodificado, é JSON com os serviços da ficha;
  - o texto de demonstração está na página;
  - há pelo menos 3 `data-agendar`.

**Commit:** `feat(sites): booking drawer with the simulated source`

### Task 11: Layouts de barbearia (com a sua aprovação)

**Files:**
- Modify: `sites/src/estilos/secoes.css`, acrescentando as variantes `inicio--cheia`, `inicio--dividida`, `servicos--cartoes`, `depoimentos--cartoes`, `galeria--faixa` e `galeria--mosaico`
- Create: `sites/src/estilos/layouts/{classica,moderna-escura,minimal}.css`, importados no `Base.astro`
- Modify: `sites/build.test.ts`

**Processo:**
1. Carregue as skills `frontend-design` e `emil-design-eng`.
2. Cada layout diverge num eixo:
   - `classica` = tradição: creme, serifa, faixa de barbeiro e foto em moldura;
   - `moderna-escura` = impacto: preto, dourado, caixa alta e foto cheia com degradê;
   - `minimal` = respiro: branco, grotesca, grade rígida e verde-escuro.
3. **Checkpoint:**
   1. Rode `npm run sites:local`.
   2. Peça para você abrir `http://127.0.0.1:4321/previas/` no navegador do VS Code e comparar `exemplo-barbearia-*` e `exemplo-pior-barbearia-*`.
   3. Ajuste até você aprovar, e registre a aprovação no ledger.

**Teste de build:** o CSS gerado contém `[data-layout="classica"]`, `[data-layout="moderna-escura"]` e `[data-layout="minimal"]` (com ou sem aspas), e as classes das 6 variantes.

**Commit:** `feat(sites): barbearia layouts`

### Task 12: Layouts de estética (com a sua aprovação)

O mesmo da Task 11.

**Files:**
- Modify: `sites/src/estilos/secoes.css`, acrescentando a variante `inicio--arco` (foto em arco)
- Create: `sites/src/estilos/layouts/{suave,luxo,clean}.css`

**Eixos:**
- `suave` = delicado: rosado, Cormorant e arco;
- `luxo` = sofisticado: escuro quente, Bodoni, dourado e filetes finos;
- `clean` = claro: branco com lilás, DM Serif e cartões.

**Checkpoint:** compare `exemplo-estetica-*` e `exemplo-pior-estetica-*` e aprove.

**Teste:** o teste de CSS passa a cobrir os 6 layouts e a variante `inicio--arco`.

**Commit:** `feat(sites): estetica layouts`

### Task 13: Verificação no navegador (WebKit)

**Antes de tudo:** peça confirmação para baixar o WebKit do Playwright. São cerca de 100 MB vindos da CDN do Playwright. A instalação fica dentro de `node_modules` (`PLAYWRIGHT_BROWSERS_PATH=0`), não no sistema.

```bash
npm i -D playwright@1.64.0
PLAYWRIGHT_BROWSERS_PATH=0 npx playwright install webkit
```

**Files:**
- Create: `sites/cli/servir.ts`, `sites/cli/prints.ts`, `sites/e2e/agendar.e2e.ts`

**Interfaces (Produces):**
- `servir(pasta, base = "/previas/"): Promise<{ url; fechar }>`:
  - servidor estático só em `127.0.0.1`, porta aleatória;
  - devolve `index.html` quando o caminho é uma pasta;
  - recusa caminhos que saiam da pasta (`..`).
- `prints.ts`:
  1. faz o build `local`;
  2. lê os links da raiz;
  3. tira prints em 390×844 @3x (celular, toque) e em 1280×800, depois de rolar a página para carregar as imagens lazy;
  4. grava em `sites/.prints/<caminho>--celular.png` e `--computador.png`.

**Testes e2e** (build `exemplos`, WebKit, 390×844, `pt-BR`, `America/Sao_Paulo`):
1. Agendar Corte com o 1º profissional no 2º dia aberto e no 1º horário: aparece a confirmação de demonstração. Ao reabrir e escolher o mesmo serviço, profissional e dia, aquele horário não aparece mais.
2. O botão "Agendar" de um serviço abre a gaveta já em "Com quem?".
3. Esc fecha a gaveta.
4. Nenhuma das 12 páginas de exemplo tem `scrollWidth` maior que 390.

**Depois:**
- **`mobile-native`:** rode a skill sobre os exemplos e aplique as correções que fizerem sentido para um site (ponto de toque, hover só com mouse, `dvh`, áreas seguras, `theme-color`).
- **`break-ui`:**
  1. Rode a skill com os piores casos, mudando só os dados.
  2. Relate o que quebrou.
  3. Corrija só o que você aprovar.
- Registre tudo no ledger.

**Pronto quando:** `npm run sites:e2e` passa e `npm run sites:prints` gera os prints dos 12 exemplos.

**Commit:** `test(sites): browser checks with WebKit and screenshots`

### Task 14: Publicar, remover e link no caderno

**Files:**
- Create: `sites/src/publicar.ts` (teste: `publicar.test.ts`), `sites/src/remover.ts` (teste: `remover.test.ts`), `sites/cli/publicar.ts`, `sites/cli/remover.ts`
- Modify: `painel/construir.ts`, `painel/construir.test.ts`

**Interfaces (Produces):**
- `type Publicadas = Record<string, { url: string; publicadaEm: string }>`.
- `lerFichas(raiz): Ficha[]`: valida cada ficha.
- `lerPublicadas(raiz): Publicadas`: devolve `{}` se o arquivo não existir.
- `sincronizar(origem, destino)`: apaga tudo no destino menos o `.git`, copia a origem e grava `.nojekyll`.
- `publicarPrevias({ raiz, agora, construir, git }): { publicadas; mudou }`, nesta ordem:
  1. recusa se não houver clone, com a mensagem `git clone https://github.com/NeekNegoer/previas.git sites/dist`;
  2. recusa se houver rascunho, com `Ainda em rascunho: a, b. ...`;
  3. faz o build em `sites/.saida`;
  4. sincroniza com o clone;
  5. apaga a pasta `.saida`;
  6. `add -A`;
  7. faz o commit só se o `status --porcelain` mostrar mudança;
  8. sempre roda `push -q origin HEAD:main`;
  9. só depois do push, grava `sites/publicadas.json`, mantendo o `publicadaEm` quando a URL não mudou.
- `removerPrevia(raiz, slug)`:
  - recusa slug fora de `^[a-z0-9-]+$`;
  - recusa quando a ficha não existe;
  - apaga a ficha e `sites/src/fotos/<slug>/`.
- CLIs:
  - `publicar`: usa `construirSites` no modo `publicar` e `git -C sites/dist`; mostra os links e o lembrete de `painel:construir` e `painel:publicar`.
  - `remover`: mostra o próximo passo.
- `painel/construir.ts`: lê `sites/publicadas.json`, se existir, e preenche `previaUrl` de cada documento. Não importa nada de `sites/`.

**Testes** (com `construir` e `git` falsos):
- **Recusas:** sem clone e com rascunho. Nos dois casos, nada é chamado.
- **Sincronização:** mantém o `.git`, apaga a prévia removida e grava `.nojekyll`.
- **Commit e push:**
  - `status` com mudança: commit e push;
  - `status` limpo: só push;
  - push que lança: `publicadas.json` continua igual e o erro se propaga.
- **`publicadas.json`:** tem a URL `urlBase + slug-sufixo/` e mantém o `publicadaEm` anterior.
- **Remover:** slug com `..` é recusado; a ficha e as fotos são apagadas.
- **Caderno:** com `publicadas.json`, o lead decriptado tem `previaUrl`; sem o arquivo, `null`.

**Commit:** `feat(sites): publish previews and link them in the caderno`

### Task 15: Repositório privado, Pages, primeira publicação e documentação

**Checkpoints:** cada passo voltado para fora pede confirmação antes.

1. **Repositório:** `~/Documents/.brew/bin/gh repo create NeekNegoer/previas --private --description "Prévias de sites"`.
2. **Clone:** `git clone https://github.com/NeekNegoer/previas.git sites/dist`.
3. **Identidade:** copie `user.name` e `user.email` de `painel/dist` para `sites/dist`.
4. **Publicação vazia:** `npm run previas:publicar` faz o primeiro commit, com a raiz vazia e o ícone.
5. **Pages:** `gh api -X POST repos/NeekNegoer/previas/pages -f "source[branch]=main" -f "source[path]=/"`.
6. **Esperar:** use o Monitor com um laço `until` até `https://neeknegoer.github.io/previas/` responder 200.
7. **Conferir:**
   - a raiz tem `noindex` e nenhum link;
   - `gh repo view NeekNegoer/previas --json visibility` responde `PRIVATE`.
8. **README:**
   - troque a seção "O Plano B (a planejar)" por "O Plano B1: prévias", com o fluxo da spec B1 (seção 5) e os comandos `ficha`, `sites:local`, `previas:publicar`, `previa:remover`, `sites:prints` e `sites:e2e`;
   - na tabela de custos, troque "Cloudflare Pages" por "GitHub Pages (prévias, repositório privado) | grátis com o GitHub Pro";
   - em Privacidade, explique que fichas e fotos das prévias ficam fora do git e que o link é público, mas a lista de prévias é privada.
9. **Spec B1:**
   - tire o `robots.txt` das seções 4 e 11 (o buscador só lê o da raiz do domínio; quem protege é o `noindex`);
   - registre que o `.nojekyll` é gravado pelo `publicar`.
10. **Fechamento:**
    1. Rode `npm test`, `npm run typecheck` e `npm run sites:e2e`.
    2. Faça o commit `docs: document the B1 preview flow`.
    3. Siga para `superpowers:finishing-a-development-branch`.

**Pronto quando:**
- a raiz das prévias está no ar, vazia;
- o repositório é privado;
- os testes passam.

A primeira prévia real, a Barbearia Fio Navalha, é a etapa 4 do Plano B. Ela vem depois do Gmail de demonstração e do B2.
