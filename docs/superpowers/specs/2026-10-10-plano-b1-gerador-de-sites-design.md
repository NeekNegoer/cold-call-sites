# Plano B1 — Gerador de sites — Design

Data: 2026-10-10 · Status: em revisão · Detalha a parte de sites da seção 6 da [spec principal](2026-10-09-cold-call-sites-design.md). Onde as duas divergem, vale esta.

## 1. Objetivo

Gerar, sob pedido, a prévia personalizada de um lead já revisado: um site de uma página com o nome, as fotos, as avaliações e o horário do negócio, e um botão Agendar que demonstra a agenda online.

**Sucesso do B1:** a partir de um lead detalhado, `npm run ficha` + personalização + `npm run previas:publicar` deixam no ar uma prévia que abre bem no celular, passa nos testes e aparece no botão Prévia do caderno.

## 2. Ordem do Plano B

Decidida em 2026-10-10:

1. **B1 — gerador de sites** (esta spec).
2. **Gmail de demonstração:** você cria uma conta que serve só para mostrar como a agenda funciona.
3. **B2 — agenda de demonstração** nesse Gmail (motor Apps Script). O widget do B1 troca a fonte simulada pela real.
4. **Prévia da Barbearia Fio Navalha** (`barbearia-fio-navalha01`), a primeira aplicação real.

Ficam para quando fechar o primeiro cliente: onde roda a agenda de um cliente de verdade, o domínio e a hospedagem do site final.

## 3. Decisões

| Tema | Decisão |
|---|---|
| Relação com o Plano A | O A só pega leads. O B1 lê `leads/<slug>.json` e `sites/public/fotos/<slug>/` e não muda nada em `prospeccao/`. A única mudança fora de `sites/` é o `painel:construir` preencher o link da prévia. |
| Quando nasce uma prévia | Sob pedido: você revisa o lote no caderno e pede no chat as prévias que quer. |
| Variação entre prévias | Layouts por nicho (3 de barbearia, 3 de estética) + tema por lead (cores, fontes, textos, fotos). |
| Agendar | Widget completo com fonte simulada no navegador. O B2 troca só a fonte. |
| Hospedagem das prévias | Repositório privado `NeekNegoer/previas` com GitHub Pages (conta Pro, via Student Pack). O link é público; o código e a lista de prévias, não. |
| Stack | Astro 7 estático, TypeScript, sem React. `sharp` (vem com o Astro) otimiza as fotos. Fontes via `@fontsource`. Playwright com WebKit só em desenvolvimento. |
| Aprovação visual | Você abre o localhost no navegador do VS Code (ou em qualquer navegador) e, no fim, confere no celular. |

## 4. Estrutura

```
sites/
├── astro.config.ts
├── config.json              urlBase das prévias
├── nichos.json              serviços, durações e textos-base por nicho
├── estaticos/               publicDir do Astro: robots.txt, ícone, .nojekyll
├── public/fotos/            (fora do git) do Plano A; o Astro NÃO usa esta pasta
├── src/
│   ├── fichas/              (fora do git) 1 ficha JSON por prévia pedida
│   ├── fotos/               (fora do git) fotos copiadas só das prévias pedidas
│   ├── exemplos/            fichas fictícias versionadas: normal e pior caso
│   ├── layouts/             barbearia: classica, moderna-escura, minimal · estetica: suave, luxo, clean
│   ├── components/          seções + widget de agendamento
│   ├── tema/                pares de fontes curados + cálculo de contraste
│   ├── agenda/              interface FonteAgenda, fonte simulada, horários livres
│   ├── ficha/               schema, conversão do lead em rascunho, horários do Google
│   └── pages/               [previa]/index.astro, [previa]/privacidade.astro, index.astro (vazia)
├── cli/                     ficha.ts, publicar.ts, remover.ts
├── publicadas.json          (fora do git) slug → link e data de publicação
└── dist/                    (fora do git) clone do repo privado NeekNegoer/previas
```

`sites/public/` continua sendo onde o Plano A guarda as fotos de todos os leads detalhados. Se o Astro usasse essa pasta, todo build publicaria fotos de leads que você nunca pediu. Por isso o `publicDir` do Astro é `sites/estaticos/`.

## 5. Fluxo

1. O Plano A gera e detalha o lote (`buscar`, `lote`, `detalhar`, `painel:*`).
2. Você revisa no caderno e pede prévias no chat, pelo nome ou slug.
3. `npm run ficha <slug>` cria o rascunho (seção 7).
4. Claude personaliza a ficha e marca `rascunho: false`.
5. `npm run sites:local` mostra as prévias e os exemplos em `http://127.0.0.1:4321`.
6. `npm run previas:publicar` publica (seção 10).
7. `npm run painel:construir` + `npm run painel:publicar`: o botão Prévia passa a abrir o link.

Para tirar uma prévia do ar: `npm run previa:remover <slug>` e depois os passos 6 e 7.

## 6. Ficha (`sites/src/fichas/<slug>.json`)

O build valida todas as fichas e para com mensagem clara (arquivo, campo, motivo) quando alguma está errada.

- `slug` (do lead), `sufixo` (4 caracteres `[a-z0-9]` sorteados), `placeId`, `modo` (`previa` | `final`), `nicho` (`barbearia` | `estetica`), `layout` (um dos 3 do nicho), `nome` (de exibição), `rascunho` (booleano).
- `tema`: `fundo`, `superficie`, `texto`, `destaque` (hex) e `fontes` (id de um par da lista curada).
  - A cor do texto dos botões é preta ou branca, a que contrastar mais com o destaque.
  - O build exige contraste de pelo menos 4,5:1 entre texto e fundo, texto e superfície, e texto do botão e destaque.
- `textos`: `titulo`, `subtitulo`, `sobre`, `chamada`.
- `servicos[]`: `nome`, `duracaoMin`, `preco` opcional. **Com `modo: previa`, o preço é proibido**, para nunca inventar valor.
- `profissionais[]`: `nome` e `foto` opcional. Pode ficar vazio.
- `depoimentos[]`: `autor`, `texto`, `nota`. O autor aparece abreviado ("Carlos M.").
- `fotos[]`: `arquivo` (em `sites/src/fotos/<slug>/`), `alt`, `legenda` opcional. A primeira é a foto principal.
- `contato`:
  - `telefone`, `whatsapp`, `instagram`, `endereco`, `mapsUrl`;
  - `horarios`: chaves `seg` a `dom`, cada uma com uma lista de intervalos `["09:00", "20:00"]` (vazia = fechado; aceita intervalo de almoço);
  - `horariosEstimados` (booleano).
- `agenda`: `simulada` no B1; `demo` depois do B2.

O link da prévia é `<urlBase><slug>-<sufixo>/`, por exemplo `https://neeknegoer.github.io/previas/barbearia-fio-navalha01-k7q2/`.

## 7. Rascunho (`npm run ficha <slug>`)

- **Recusa:** lead inexistente; lead com `fase` diferente de `detalhado`; ficha já existente, para não apagar a personalização.
- **Copia as fotos** de `sites/public/fotos/<slug>/` para `sites/src/fotos/<slug>/`.
- **Horários:** converte os do Google ("09:00 to 20:00", "Fechado", "Open 24 hours", intervalos separados por vírgula).
  - Um dia que não reconhece fica marcado no rascunho para Claude resolver.
  - Se o lead não tem horário nenhum, usa o horário padrão do nicho e marca `horariosEstimados: true`. O site esconde a seção de horário, e só o widget usa esses horários.
- **Serviços:** os padrões do nicho em `sites/nichos.json`, sem preço:
  - barbearia: corte 30 min, barba 30, corte + barba 60, sobrancelha 15;
  - estética: design de sobrancelha 30, design com henna 45, brow lamination 60, buço 15.
- **Depoimentos:**
  - Até 5 avaliações com texto e nota 4 ou mais, as de nota maior primeiro.
  - Textos com mais de 300 caracteres são cortados no fim de uma palavra, com "…".
  - O autor vira "Primeiro nome + inicial."; sem nome, vira "Cliente do Google".
- **Textos genéricos** do nicho com o nome e o bairro, primeiro layout do nicho, tema padrão do layout, `rascunho: true`.

Personalização (Claude, lead a lead):
1. Olhar as fotos e escolher layout, cores, fontes e a foto principal.
2. Ajustar o nome (por exemplo, tirar o "01" de "Fio Navalha01").
3. Escrever os textos com o que as avaliações destacam.
4. Pôr os profissionais citados nas avaliações.
5. Marcar `rascunho: false`.

## 8. Layouts e seções

- Barbearia: `classica`, `moderna-escura`, `minimal`. Estética: `suave`, `luxo`, `clean`. Barbearia primeiro: são 22 dos 25 leads do lote atual.
- Todos usam as mesmas seções e componentes; mudam composição, tipografia, formas e movimento.
- Direção visual com a skill `frontend-design` e acabamento com as skills do Emil Kowalski.
- Os protótipos são feitos com a skill `prototype` sobre as fichas de exemplo e aprovados por você, lado a lado, antes de virarem modelo.
- As fichas de exemplo (`sites/src/exemplos/`) são fictícias e não têm nenhum dado real:
  - normal: nome e textos típicos, fotos neutras;
  - pior caso: nome enorme, sem fotos, 1 avaliação, sem horário, sem profissionais.

Seções (uma página só, pensada primeiro para o celular):

1. Faixa "Prévia criada para <nome>" (só com `modo: previa`)
2. Início: nome, subtítulo, botão Agendar, foto principal
3. Serviços (nome e duração; preço só no modo final)
4. Equipe (some sem profissionais)
5. Depoimentos (somem sem avaliações)
6. Galeria (some sem fotos)
7. Localização e horário: endereço, botão "Como chegar" (link do Maps, sem mapa incorporado), horários com o dia de hoje destacado (some com `horariosEstimados`)
8. Rodapé: Instagram, WhatsApp, link para a privacidade

Mais a página `/privacidade` (LGPD). Na prévia, ela informa que o agendamento é simulado e que nada sai do navegador.

## 9. Widget de agendamento (fonte simulada)

- Abre como gaveta de baixo para cima no celular e como janela no computador. Astro + TypeScript, sem biblioteca de interface.
- Passos:
  1. Serviço.
  2. Profissional, ou "sem preferência" (passo pulado sem profissionais).
  3. Dia, entre os próximos 14, com os dias fechados desativados.
  4. Horário livre.
  5. Nome, celular e e-mail opcional, mais um campo isca escondido.
  6. Confirmação.
- Fuso: America/Sao_Paulo.

Interface que o widget usa (o B2 implementa a mesma com o Apps Script):

```ts
interface FonteAgenda {
  horarios(q: { servico: string; profissional: string | null; data: string }): Promise<string[]>;
  agendar(p: {
    servico: string; profissional: string | null; data: string; hora: string;
    nome: string; celular: string; email?: string; isca: string;
  }): Promise<{ ok: true } | { ok: false; erro: "ocupado" | "limite" | "invalido" }>;
}
```

**Horários livres:** função pura, testada e reaproveitada no B2. Recebe o funcionamento do dia, os intervalos ocupados, a duração do serviço, o passo (30 min) e a antecedência mínima (60 min a partir de agora). Devolve os inícios em que o serviço cabe inteiro dentro do funcionamento sem encostar em nenhum ocupado. "Sem preferência" une os horários de todos os profissionais.

**Fonte simulada:**
- **Ocupação fictícia:** cerca de 30% dos horários aparecem ocupados, decididos por um hash de slug + data + profissional + hora. A mesma prévia mostra sempre a mesma agenda.
- **Agendamentos:** ficam no `sessionStorage`, na chave `previa:<slug>:agendamentos`. Depois de agendar, o horário some.
- **Erros:**
  - `invalido`: celular brasileiro inválido (importa a função de `prospeccao/telefone.ts`, sem mudar o arquivo) ou campo isca preenchido;
  - `limite`: mais de 2 agendamentos por celular no mesmo dia;
  - `ocupado`: horário tomado entre a escolha e a confirmação.
- **Confirmação:** termina com "Agendamento de demonstração: nada foi marcado de verdade."
- **Tratamento dos erros:**
  - `ocupado`: aviso e os horários recarregam;
  - falha da fonte (só acontece no B2): mensagem com o WhatsApp e o telefone do negócio.

## 10. Publicação

- **Criação do repo** (uma vez, com sua confirmação): repo privado `NeekNegoer/previas` com Pages servindo a branch `main` na raiz, e o clone em `sites/dist/`. Endereço: `https://neeknegoer.github.io/previas/` (`urlBase` em `sites/config.json`).
- **`npm run previas:publicar`:**
  1. Recusa se alguma ficha ainda tiver `rascunho: true`, ou se `sites/dist/` não for um clone git.
  2. Roda o build do Astro numa pasta temporária (`sites/.saida/`). O Astro esvazia a pasta de saída a cada build e apagaria o `.git` do clone.
  3. Sincroniza o resultado em `sites/dist/`: apaga o que saiu, mantém o `.git` e garante o `.nojekyll`, porque o Jekyll ignoraria a pasta `_astro/`.
  4. Faz commit e push.
  5. Reescreve `sites/publicadas.json` com as fichas publicadas e mostra os links.
- **O que vai para o ar:** só as fichas existentes em `sites/src/fichas/`, ou seja, só os leads pedidos e só as fotos deles. As fichas de exemplo nunca são publicadas.
- **Caderno:** o `painel:construir` lê `sites/publicadas.json` (que pode não existir) e preenche o `previaUrl` de cada documento antes de criptografar. `prospeccao/` não muda.
- **`npm run previa:remover <slug>`:** apaga a ficha e as fotos copiadas. A prévia sai do ar no próximo publicar. O histórico do repo privado guarda as versões antigas.

## 11. Segurança e privacidade

- **O que fica fora do git público:** `sites/src/fichas/`, `sites/src/fotos/`, `sites/dist/`, `sites/.saida/`, `sites/publicadas.json` e os prints. As fichas de exemplo versionadas são fictícias.
- **Mesmo domínio do caderno:** prévias e caderno ficam em `neeknegoer.github.io` e dividem o armazenamento do navegador, onde fica a senha do caderno quando "Lembrar neste aparelho" está marcado. Por isso, nas prévias:
  - nenhum script de terceiros;
  - fontes servidas pelo próprio site, sem Google Fonts (evita também mandar o IP do visitante ao Google);
  - textos da ficha sempre escapados, nunca `set:html`;
  - o widget só usa chaves `previa:` do `sessionStorage` e nunca lê nem escreve chaves `caderno:`.
- **Contra quem chega por acaso:**
  - `robots.txt` bloqueando tudo e `<meta name="robots" content="noindex, nofollow">` em toda página (o Pages não envia cabeçalhos próprios);
  - `<meta name="referrer" content="no-referrer">`;
  - raiz vazia e sufixo aleatório no link;
  - faixa de prévia e confirmação de demonstração.
- **Dados de quem avaliou:** só o primeiro nome e a inicial do autor.
- **Dados de quem agenda:** na prévia, nome e celular não saem do navegador.

## 12. Testes e verificação

**Testes automáticos** (`node:test`, TDD), com `sites/**/*.test.ts` incluído no `npm test`. Cobrem:
- conversão dos horários do Google;
- lead → rascunho da ficha (serviços, depoimentos, autor abreviado, cortes, horário estimado, recusas);
- validação da ficha (campos, preço proibido em prévia, layout do nicho);
- contraste e escolha da cor do texto do botão;
- horários livres (bordas do funcionamento, intervalo de almoço, antecedência, dia fechado, "sem preferência");
- ocupação fictícia determinística;
- fonte simulada (agendar some com o horário, `ocupado`, `limite`, `invalido`);
- publicar (recusa rascunho, recusa sem clone, sincronização mantém o `.git`, `publicadas.json`);
- `painel:construir` com e sem `publicadas.json`.

**Build:** `astro build` das fichas de exemplo nos testes de ponta a ponta. A página gerada não carrega nenhum script, folha de estilo, fonte ou imagem de terceiros (links de Instagram, WhatsApp e Maps são permitidos) e não contém a palavra `caderno:`.

**Visual:**
- Playwright com WebKit (motor do Safari/iPhone, cerca de 100 MB, instalado só para o projeto com sua confirmação).
- `npm run sites:prints` tira prints em 390 px de cada layout com as fichas de exemplo e de cada prévia, em `sites/.prints/` (fora do git).
- Rodar a baseline da skill `mobile-native` e o pior caso com a `break-ui` em todos os layouts.
- Conferência final: você no celular.

**Tipos:** `tsc --noEmit` cobre os `.ts`. `astro check` cobre os `.astro`, se funcionar com o TypeScript 7. Se não funcionar, os `.astro` ficam cobertos pelo build e pelos testes de ponta a ponta.

## 13. Fora do escopo do B1

- Motor real da agenda (B2) e o Gmail de demonstração.
- Modo `final`: domínio, hospedagem paga e build na raiz do domínio do cliente.
- Geração de fichas em lote, prévia de lead não detalhado e remoção automática pelo status do caderno.
- Mapa incorporado, formulário de contato, várias páginas.

## 14. Riscos

- **Fim do GitHub Pro:** sem o Pro (fim do Student Pack), o Pages de repo privado para e as prévias saem do ar. A saída é mudar a hospedagem, porque a pasta gerada serve em qualquer lugar estático.
- **Uso comercial:** os termos do GitHub vedam o Pages como hospedagem comercial. Para prévias de venda o risco é baixo; sites de clientes não vão para o Pages.
- **Usuário no link:** o dono vê "neeknegoer" no link da prévia, o que deixa de existir com domínio próprio.
- **Fotos do Google Maps:** as fotos são de quem as postou no Google Maps. Elas aparecem só na prévia mostrada ao próprio negócio e são trocadas pelo material do cliente no site final.
