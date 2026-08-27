# TRÍADE — briefing completo para o Claude Code

> **Arquivo único e autossuficiente.** Coloque este arquivo na raiz do repositório
> (pode renomear para `CLAUDE.md`) e mande o Claude Code ler antes de qualquer coisa.
> Ele contém: o prompt inicial, a especificação de todas as telas, os tokens do
> design system, o contrato de dados da API e o backlog priorizado.

---

## COMECE POR AQUI — prompt inicial

Cole isto no Claude Code:

```
Leia este arquivo inteiro. Ele especifica o TRÍADE, um app mobile de astrologia
em português do Brasil que lê o nascimento em três tradições (ocidental, chinesa
e egípcia).

O que existe hoje:
- Um serviço Python (FastAPI) que CALCULA de verdade os três sistemas. Ele está
  na pasta astro-calc-service/ (se não estiver no repo, peça). Ele não interpreta
  nada — só devolve números e nomes de signo.
- Um protótipo de design em HTML (Triade.dc.html) que mostra a UI final. É
  REFERÊNCIA VISUAL, não código de produção. Os signos nele são fixos.

Sua tarefa, em ordem:
1. Escolha o stack (se ainda não existir: sugiro Expo/React Native com um
   backend Next.js, conforme a arquitetura descrita abaixo) e monte o esqueleto.
2. Resolva o P0 da seção TAREFAS: a data digitada no onboarding tem que
   determinar os três signos exibidos. Nenhum nome de signo pode existir como
   literal no código de UI.
3. Implemente as telas conforme a seção TELAS, seguindo os tokens do design
   system Modernist (zero border-radius, réguas de 2px, Archivo, tudo à esquerda).
4. Siga o CONTRATO DE DADOS campo a campo.

Antes de começar, me faça as perguntas que faltam sobre stack e infraestrutura.
Não invente valores de design que não estejam nos tokens.
```

### Arquitetura pretendida

```
App mobile  --> Backend Next.js  --> astro-calc-service (FastAPI, Python)
                                              |--> Só calcula
                        |--> Claude API (interpretação em PT-BR)
                        |--> Supabase (natal_charts, users, sinastrias)
```

---

# PARTE 1 — DESIGN E TELAS

> **Para o Claude Code:** leia este README inteiro antes de escrever código.
> A tarefa principal pendente está em `TAREFAS.md` — **conectar os dados reais**.
> Hoje o protótipo mostra signos fixos (hardcoded) que **não** derivam da data
> digitada. Esse é o bug conceitual que precisa sumir.

---

## Visão geral

TRÍADE lê o nascimento de uma pessoa em três tradições ao mesmo tempo —
ocidental (mapa astral), chinesa (calendário lunissolar) e egípcia
(sistematização moderna de divindades) — e cruza as três numa leitura diária.
Interface em **português do Brasil**, tom de amigo, linguagem sem jargão.

Arquitetura pretendida (já decidida):

```
App mobile  --> Backend Next.js  --> astro-calc-service (FastAPI, Python)
                                              |--> Só calcula (Swiss Ephemeris,
                                                   lunissolar, tabela egípcia)
                        |--> Claude API (interpretação em PT-BR)
                        |--> Supabase (natal_charts, users, sinastrias)
```

O serviço Python **não interpreta nada**. Ele devolve números e nomes de signo.
Quem transforma isso em texto é a Claude API, no backend Next.js.

---

## Sobre os arquivos de design

Os arquivos em `design/` são **referência de design feita em HTML** — um
protótipo que mostra aparência e comportamento pretendidos, **não** código de
produção para copiar e colar. A tarefa é **recriar essas telas no ambiente do
app real** (React Native / Expo, Next.js + React, SwiftUI — o que o projeto
adotar), usando os padrões e a biblioteca de componentes desse ambiente.
Se ainda não existir um app, escolha o framework e implemente lá.

`design/Triade.dc.html` abre direto no navegador. Ele usa um formato de
componente próprio da ferramenta de design (template + classe de lógica). Trate
como especificação visual, não como fonte.

### Fidelidade

**Alta fidelidade (hifi).** Cores, tipografia, espaçamento, hierarquia e
microcopy são finais e devem ser reproduzidos fielmente. As interações do
protótipo (navegação, abas, chat, checkbox de hora) representam o
comportamento pretendido.

---

## Design system — Modernist

Toda a UI segue o design system **Modernist** (arquivos em
`design/_ds/modernist-.../ (nome exato da pasta a confirmar)`; o guia completo está em `readme.md` dentro dessa
pasta). Regras não negociáveis:

- **Zero border-radius** em qualquer lugar. `--radius-*` é `0px` de propósito.
- **Réguas de 2px**, não hairlines. Divisórias fortes organizam a tela.
- **Tudo alinhado à esquerda**, inclusive rótulos dentro de botões largos.
- **Uma única fonte: Archivo** (400/500/600/700/800/900), títulos em 800-900.
- Vermelho usado com parcimônia — ação primária, ênfase pequena, e **um** bloco
  pôster por tela no máximo (o cartão de triangulação do dia).
- Ícones: **Lucide**. O protótipo usa glifos de texto como placeholder
  (caracteres Unicode diversos representando cada aba) — substituir por Lucide na implementação.

### Tokens

| Token | Valor |
| --- | --- |
| `--color-bg` | `#f3f2f2` |
| `--color-surface` | `#eae9e9` |
| `--color-text` | `#201e1d` |
| `--color-accent` | `#ec3013` |
| `--color-accent-100` | `#fff2ef` (faixa de aviso) |
| `--color-accent-600` | `#dd2b0f` (pressed) |
| `--color-accent-700` | `#ae1800` (texto vermelho em corpo) |
| `--color-accent-800` | `#7c1405` (texto sobre fundo accent-100) |
| `--color-divider` | `#201e1d` a 40% |
| `--color-neutral-500/600/700` | `#9b9797` / `#7d7979` / `#605d5d` |
| Espaçamento | 4 / 8 / 12 / 16 / 24 / 32 px |
| Raio | `0px` |
| Sombra | `--shadow-sm/md/lg` (praticamente não usadas — o sistema é flat) |

### Escala tipográfica usada nas telas

| Uso | Estilo |
| --- | --- |
| Título de tela | Archivo 900, 40px, line-height 0.95, letter-spacing -0.02em |
| Título de onboarding | Archivo 900, 38px/0.98 |
| Nome do signo (aba) | Archivo 900, 46px/0.95 |
| Título de bloco pôster | Archivo 800, 27px/1.1 |
| Título de linha/card | Archivo 800, 17-20px/1.15 |
| Corpo | Archivo 400, 15-16px/1.5 |
| Corpo secundário | Archivo 400, 13.5-14px/1.45, cor neutral-700 |
| Kicker / rótulo | Archivo 700, 9-10px, letter-spacing 0.16-0.18em, UPPERCASE |
| Rótulo de tab bar | Archivo 700, 9px, letter-spacing 0.1em, UPPERCASE |
| Botão | Archivo 700, 15-16px, padding 18px, texto à esquerda |
| Campo de input | Archivo 500, 17px, borda 2px sólida `--color-text`, padding 14px |

Alvos de toque nunca abaixo de 44px.

---

## Telas

Device de referência: **402 x 874** (iPhone 16 Pro). A status bar é overlay;
o conteúdo começa em `padding-top: 70px`. A tab bar tem borda superior de 2px e
`padding-bottom: 30px` (home indicator).

### 1. Onboarding — 3 passos

**Objetivo:** coletar o mínimo para calcular: data, hora, local.

Estrutura comum: marca `TRÍADE` (900/15px, letter-spacing .14em) à esquerda e
contador `01 / 03` em vermelho à direita; régua de 2px preta com uma barra
vermelha por cima cobrindo `(passo+1)/3` da largura; título 38px; parágrafo de
apoio; campos; rodapé com `Voltar` (outline, só a partir do passo 2) +
botão primário que ocupa o resto da largura.

| Passo | Campos | Copy do título |
| --- | --- | --- |
| 1 | Nome, Data de nascimento (DD/MM/AAAA) | "Quem está chegando?" |
| 2 | Hora (HH:MM) + checkbox "Não sei a hora exata" | "Que horas eram?" |
| 3 | Cidade, País | "Onde foi?" |

Botão do passo 3: **"Montar meu mapa"** — tela de cálculo.

**Tela de cálculo:** fundo inteiro `--color-accent`, kicker branco
"CALCULANDO", régua branca, frase 34px/900 em branco. Duração no protótipo:
1500ms. No app real, exibir enquanto as três chamadas de API não resolvem
(e tratar erro — ver `TAREFAS.md`).

Validação necessária (não implementada no protótipo):
data válida e no passado; hora `HH:MM` 24h; cidade obrigatória;
erro de geocoding (HTTP 422 do serviço) — mensagem "Não encontramos essa
cidade. Tente escrever o nome completo" e manter o usuário no passo 3.

### 2. Hoje (home)

Ordem vertical:

1. Data por extenso (kicker, neutral-600) + `Olá, {primeiroNome}.` em 40px/900.
2. **Bloco pôster** full-bleed em `--color-accent`, texto branco:
   kicker "TRIANGULAÇÃO DE HOJE", régua branca 35% opaca, frase-síntese
   800/27px, parágrafo de apoio 14.5px. É o único bloco vermelho da tela.
3. **Faixa de aviso** (só quando a hora é desconhecida): fundo `accent-100`,
   bordas superior e inferior de 2px `accent`, ícone `!` quadrado 20px com
   borda 2px, texto 13px `accent-800`.
4. **Três linhas** — Ocidental / Chinês / Egípcio. Cada uma: glifo vermelho
   numa coluna fixa de 44px, kicker do sistema, nome do signo 800/20px, e uma
   frase do dia. Clicar leva para a aba correspondente em Signos.
5. Botão preto largo **"Conversar sobre hoje"** com seta à direita; hover vira
   vermelho.
6. **Próximos trânsitos** — kicker + régua 2px + lista (data em vermelho numa
   coluna de 52px, título, nota).
7. **Card de sinastria** com borda 2px.

### 3. Signos — uma tela, três abas

Título "Seus signos" + linha de abas (Ocidental / Chinês / Egípcio) alinhadas à
esquerda, `flex: 1` cada, borda inferior 2px preta na régua e sublinhado
**vermelho de 4px** na aba ativa; aba inativa em `neutral-500`.

Cada painel: nome do signo em 900/46px, linha de metadados, régua 2px, dois
parágrafos em linguagem simples, e um bloco de apoio:
- Ocidental: grid 2x2 (Elemento, Regente, Modo, Fonte) com separadores de 2px.
- Chinês: caixa com borda 2px explicando o corte do Ano Novo Chinês.
- Egípcio: linha clicável "Qual sistema egípcio usamos e por quê" — Perfil,
  seção Metodologias, já expandida.

**Decisão de produto:** o egípcio tem o mesmo peso visual dos outros; a ressalva
metodológica vive em Perfil, não como aviso na tela do signo.

### 4. Mapa

Kicker com resumo do nascimento, título "Seu mapa", faixa de aviso (se hora
desconhecida), roda astrológica em SVG 330x330 (três círculos concêntricos —
2px, 2px, 1px —, 12 marcações de 30°, triângulo vermelho ligando Sol/Lua/Asc,
grau central em 900/26px) e a lista **"O que está onde"**: glifo vermelho em
coluna de 34px, título 800/16px, tag vermelha **APROXIMADO** quando o item
depende da hora (ascendente e casas), frase em linguagem simples.

### 5. Conversa

Cabeçalho fixo com kicker + "Conversa" (900/26px) e régua 2px.
Mensagens: a IA aparece como bloco alinhado à esquerda com **barra vermelha de
3px à esquerda** e kicker "TRÍADE" (sem balão); o usuário aparece como bloco
preto de texto claro alinhado à direita, máx. 82% de largura. Indicador
"escrevendo…" em kicker cinza.
Rodapé: fila horizontal rolável de sugestões (borda 2px, hover invertido) +
input com borda 2px e botão vermelho `→`. Enter envia.

### 6. Sinastria

Título + parágrafo, dois botões lado a lado (**Convidar** primário vermelho,
**Digitar dados** outline), lista de cruzamentos (porcentagem em 900/26px
vermelho numa coluna de 54px, nome, os três signos da outra pessoa, chevron) e,
ao selecionar, um bloco com borda 2px: nome + %, título, texto e um grid de três
células (Ocid. / Chinês / Egíp.) com o tipo de relação em cada sistema.

### 7. Perfil

Nome em 900/40px, resumo do nascimento, e lista de linhas separadas por 1px:
Dados de nascimento · Hora exata (toca para alternar entre hora e "Não
informada") · Notificação diária · **Metodologias e fontes** (acordeão `+`/`−`).
Aberto, mostra três blocos com barra vermelha de 3px à esquerda: Ocidental
(Swiss Ephemeris, Placidus, fuso pelo local), Chinês (corte lunissolar) e
Egípcio (o texto de ressalva — veja abaixo). Última linha: **Sair** em
`accent-700`.

**Texto obrigatório do egípcio** (vem do próprio serviço, campo `metodologia`):

> Sistematização moderna de 12 divindades por faixa de data civil, popularizada
> no século XX. Não é um sistema astronômico comprovado do Egito antigo —
> tratamos como referência cultural, não como registro histórico.

---

## Interações e comportamento

- **Navegação:** tab bar de 5 itens (Hoje, Signos, Mapa, Conversa, Perfil).
  Sinastria não fica na tab bar — entra pelo card da home e pelo Perfil.
  A tab bar some no onboarding e na tela de cálculo.
- **Item ativo da tab bar:** vermelho; inativo `neutral-500`.
- **Hover/pressed:** botão outline inverte (fundo `--color-text`, texto
  `--color-bg`); botão vermelho vai para `--color-accent-600`; linhas de lista
  ganham fundo `--color-neutral-200`.
- **Foco de teclado:** `outline: 2px solid var(--color-accent); outline-offset: 2px`.
- **Chat:** ao enviar, a mensagem do usuário entra na hora, "escrevendo…"
  aparece e a resposta chega depois (no protótipo, 1100ms fixos; no app, stream
  da Claude API).
- **Checkbox "não sei a hora":** afeta três lugares — faixa de aviso na home,
  faixa + tags APROXIMADO no mapa, e a linha "Hora exata" no perfil.
- **Sem animações elaboradas.** Transições de 120-160ms em cor apenas. O sistema
  é flat e estático de propósito.

## Estado necessário

| Estado | Origem | Observação |
| --- | --- | --- |
| `usuario` (nome, data, hora, semHora, cidade, pais) | onboarding → Supabase | fonte da verdade de tudo |
| `mapa` | `POST /calcular/mapa-ocidental` | cachear em `natal_charts` |
| `chines` | `POST /calcular/signo-chines` | idem |
| `egipcio` | `POST /calcular/sistema-egipcio` | idem |
| `leituraDiaria` | Claude API, 1x por dia | cachear por (usuário, data) |
| `telaAtual`, `abaSignos` | UI | — |
| `mensagens`, `digitando`, `entrada` | UI + Claude API | histórico persistido |
| `sinastrias` | Supabase | por par de usuários |

---

## O que está FALSO no protótipo (o ponto levantado)

Os signos exibidos são **fixos**: Touro, Cavalo de Metal e Toth. Trocar a data
no onboarding **não muda nada**. Isso é intencional num mock, mas é exatamente
o que precisa ser resolvido primeiro na implementação.

Os três endpoints do `astro-calc-service` (incluído nesta pasta) já fazem esse
cálculo de verdade. **O contrato completo de dados — request, response e o
mapeamento campo-a-campo para cada elemento de tela — está em
`DATA_CONTRACT.md`.** As pendências estão em `TAREFAS.md`.

---

## Assets

Nenhuma imagem. Roda astrológica desenhada em SVG. Glifos planetários são
caracteres Unicode (símbolos astrológicos padrão) — na implementação, avaliar uma fonte de glifos
astrológicos ou SVGs próprios para consistência entre plataformas. Ícones da
tab bar: substituir os placeholders por **Lucide**.

## Arquivos deste pacote

```
README.md               este documento
DATA_CONTRACT.md        API → tela, campo por campo (LEIA ANTES DE CODAR)
TAREFAS.md              backlog priorizado, com o bug dos signos fixos no topo
design/
  Triade.dc.html        o protótipo (abre no navegador)
  ios-frame.jsx          moldura de iPhone usada no protótipo
  support.js             runtime da ferramenta de design
  _ds/modernist-.../ (nome exato da pasta a confirmar)      design system: styles.css (tokens) + guia
astro-calc-service/     o serviço FastAPI de cálculo, como enviado
```


---

# PARTE 2 — CONTRATO DE DADOS

Tudo que a interface mostra tem que sair destes três endpoints (mais a Claude
API para os textos). Nenhum signo pode continuar hardcoded.

Base URL do serviço de cálculo (Railway): `ASTRO_CALC_URL`.
O app **não** fala com o serviço diretamente — passa pelo backend Next.js.

---

## 1. `POST /calcular/mapa-ocidental`

```json
{ "dados": {
    "data_nascimento": "1990-05-15",
    "hora_nascimento": "14:20",
    "hora_desconhecida": false,
    "cidade": "Rio de Janeiro",
    "pais": "Brasil"
} }
```

Resposta (campos relevantes):

```json
{
  "sol":        { "signo": "Touro", "grau": 24.31, "retrogrado": false, "grau_absoluto": 54.31, "casa": 9 },
  "lua":        { "signo": "Peixes", "grau": 11.02, "...": "..." },
  "ascendente": { "signo": "Virgem", "grau": 3.77 },
  "meio_ceu":   { "signo": "Gêmeos", "grau": 1.2 },
  "planetas":   { "sol": {...}, "lua": {...}, "mercurio": {...}, "venus": {...},
                  "marte": {...}, "jupiter": {...}, "saturno": {...},
                  "urano": {...}, "netuno": {...}, "plutao": {...} },
  "casas":      [ { "signo": "Virgem", "grau": 3.77, "casa": 1 }, "… 12 itens" ],
  "aspectos":   [ { "planeta_1": "sol", "planeta_2": "lua",
                    "tipo": "trigono", "diferenca_graus": 118.4 } ],
  "metadata":   { "sistema_casas": "Placidus", "data_hora_utc_usada": "1990-05-15T17:20:00+00:00" },
  "localizacao_usada": { "latitude": -22.9, "longitude": -43.2, "timezone_iana": "America/Sao_Paulo", "...": "..." },
  "hora_confiavel": true
}
```

Erros: **422** = geocoding falhou (cidade não encontrada / sem internet).
**500** = erro no cálculo. Ambos precisam de tela — ver `TAREFAS.md`.

### Mapeamento para a tela

| Elemento de tela | Campo |
| --- | --- |
| Home, linha "Ocidental" — nome | `"Sol em " + sol.signo` |
| Aba Ocidental — nome grande | `sol.signo` |
| Aba Ocidental — linha de metadados | `Sol em {sol.signo} · Lua em {lua.signo} · Ascendente em {ascendente.signo}` |
| Aba Ocidental — grid Elemento/Regente/Modo | **derivar do signo** por tabela local (ver abaixo) — o serviço não devolve |
| Aba Ocidental — grid "Fonte" | `metadata.sistema_casas` / fixo "Swiss Eph." |
| Mapa — grau central da roda | `Math.round(sol.grau) + "°"` e `sol.signo` acima |
| Mapa — posições do triângulo | `sol.grau_absoluto`, `lua.grau_absoluto`, `ascendente` (grau absoluto = índice do signo x 30 + grau) |
| Mapa — lista "O que está onde" | um item por planeta em `planetas` + ascendente + casas relevantes |
| Mapa — tag **APROXIMADO** | `hora_confiavel === false` **e** o item é ascendente, meio-céu ou casa |
| Faixa de aviso (home e mapa) | `hora_confiavel === false` |
| Perfil — "Dados de nascimento" | `localizacao_usada` |

**Tabelas locais que o app precisa ter** (o serviço não devolve, e não deve):
signo → elemento (Fogo/Terra/Ar/Água), signo → regente, signo → modalidade
(Cardinal/Fixo/Mutável), planeta → glifo, planeta → rótulo em PT-BR
(`sol` → "Sol", `plutao` → "Plutão"), casa → tema em linguagem simples.

A roda em SVG deve ser desenhada a partir de `grau_absoluto` de verdade —
no protótipo as três posições são coordenadas fixas.

---

## 2. `POST /calcular/signo-chines`

```json
{ "data_nascimento": "1990-05-15" }
```

```json
{
  "animal": "Cavalo",
  "elemento": "Metal",
  "yin_yang": "Yang",
  "ano_efetivo_calculo": 1990,
  "metodologia": "Calendário lunissolar chinês, ano novo determinado por tabela de datas reais…"
}
```

| Elemento de tela | Campo |
| --- | --- |
| Home, linha "Chinês" — nome | `` `${animal} de ${elemento}` `` |
| Aba Chinês — título | `animal` + `de {elemento}` em vermelho |
| Aba Chinês — metadados | `ano_efetivo_calculo` + tronco/ramo + `yin_yang` |
| Aba Chinês — caixa lunissolar | comparar `ano_efetivo_calculo` com o ano da data digitada: se forem diferentes, o texto muda para "Você nasceu **antes** do Ano Novo Chinês de {ano}, então seu ciclo é o de {ano_efetivo}" |
| Perfil — metodologia chinesa | `metodologia` |

Erro **422**: ano fora da tabela (hoje a tabela começa em **1990**, apesar do
comentário no código dizer 1900-2035). Isso quebra qualquer usuário nascido
antes de 1990 — item 1 de `TAREFAS.md`.

Tronco celeste/ramo terrestre (o "Geng Wu" mostrado no design) **não** vem do
serviço. Ou derivar no app (ciclo de 10 troncos x 12 ramos a partir de 1900),
ou adicionar ao retorno do serviço — preferível o segundo.

---

## 3. `POST /calcular/sistema-egipcio`

```json
{ "data_nascimento": "1990-05-15" }
```

```json
{
  "divindade": "Toth",
  "periodo": "09/05 a 02/06",
  "metodologia": "Sistematização moderna de 12 divindades por faixa de data civil…"
}
```

| Elemento de tela | Campo |
| --- | --- |
| Home, linha "Egípcio" — nome | `divindade` |
| Aba Egípcio — título | `divindade` |
| Aba Egípcio — metadados | `periodo` + descritor curto da divindade (tabela local) |
| Perfil — metodologia egípcia | `metodologia` — **texto obrigatório, exibir na íntegra** |

---

## 4. Textos interpretativos (Claude API)

Nada do texto em linguagem simples vem do serviço de cálculo. Todo parágrafo
interpretativo é gerado pela Claude API no backend, recebendo os três JSONs
acima como contexto.

| Onde | O que gerar | Cache |
| --- | --- | --- |
| Home — bloco pôster | 1 frase-síntese (máx. ~90 caracteres) + 1 parágrafo curto, cruzando os três sistemas | por (usuário, dia) |
| Home — 3 linhas | 1 frase por sistema, sobre o dia | por (usuário, dia) |
| Home — trânsitos | título + nota por trânsito (trânsitos vêm de cálculo, não da IA) | por (usuário, semana) |
| Abas de signo | 2 parágrafos por sistema, sobre a pessoa (não sobre o dia) | por usuário, permanente |
| Mapa — lista | 1 frase por posição | por usuário, permanente |
| Conversa | streaming, com o mapa completo no system prompt | histórico persistido |
| Sinastria | título + parágrafo + rótulo por sistema | por par |

**Tom (definido com o cliente):** amigo, direto, sem jargão. Explica o termo
quando precisa usá-lo. Nunca fatalista, nunca "você vai". Prefere "isso costuma
significar". As frases do protótipo são a referência de voz — use-as como
few-shot no prompt.

**Regra editorial:** o texto pode afirmar o cálculo (posições, datas) como fato,
mas interpretação é sempre apresentada como leitura, não como previsão. O
sistema egípcio nunca é apresentado como astronomia histórica comprovada.


---

# PARTE 3 — TAREFAS

## P0 — o app precisa parar de mentir

1. **Ligar a data digitada aos signos exibidos.**
   Hoje o protótipo mostra Touro / Cavalo de Metal / Toth independentemente do
   que o usuário digita. Ao fim do onboarding, chamar os três endpoints com os
   dados reais, salvar em `natal_charts` e renderizar **só** a partir dessa
   resposta. Nenhum nome de signo pode existir como literal no código de UI.
   Ver `DATA_CONTRACT.md`.

2. **Estender a tabela `ANO_NOVO_CHINES`** em
   `astro-calc-service/app/calculators/chinese.py`.
   O docstring diz 1900-2035, mas o dicionário só tem **1990-2030**. Qualquer
   usuário nascido antes de 1990 recebe 422. Preencher 1900-1989 e 2031-2035
   com datas do calendário lunissolar (Hong Kong Observatory ou Purple Mountain
   Observatory) e escrever um teste que verifique alguns cortes conhecidos
   (ex.: 05/02/1962 → Tigre, não Boi).

3. **Testar a API de ponta a ponta.**
   `uvicorn main:app --reload --port 8000` e bater nos três endpoints. O
   geocoding nunca rodou com internet real. Confirmar `latitude`, `longitude` e
   `timezone_iana` para pelo menos 5 cidades brasileiras e 3 estrangeiras.

4. **Telas de erro.** Nenhuma existe no design:
   - 422 do geocoding → volta ao passo 3 do onboarding com mensagem inline.
   - 422 do chinês (ano fora da tabela) → nunca deve acontecer depois da
     tarefa 2; se acontecer, degradar mostrando só ocidental + egípcio.
   - 500 / timeout → tela de cálculo vira estado de falha com "Tentar de novo".
   Usar a mesma linguagem visual da faixa de aviso (accent-100 + bordas 2px).

5. **Validação do onboarding.** Data válida e no passado; `HH:MM` 24h; cidade
   obrigatória. Erro inline abaixo do campo, borda do campo em `--color-accent`.

## P1 — funcionalidade

6. **Trânsitos são cálculo, não texto.** A seção "Próximos trânsitos" está
   inventada. Precisa de um endpoint novo no serviço Python (posições planetárias
   de hoje x mapa natal, com orbe) — a Claude API só escreve a nota.

7. **Tronco celeste / ramo terrestre** no retorno do chinês (o design mostra
   "Tronco Geng · Ramo Wu").

8. **Sinastria de verdade.** Definir a fórmula do percentual antes de mostrar
   um número na tela — hoje é decorativo. Cruzamento por sistema: aspectos
   entre mapas (ocidental), compatibilidade de ramos (chinês), afinidade de
   divindades (egípcio, tabela local). Documentar o método e expô-lo no Perfil,
   junto das outras metodologias.

9. **Conversa com streaming** da Claude API, histórico persistido, e o mapa
   completo no system prompt.

10. **Cache do geocoding no Supabase** (cidade+país → lat/long/timezone).
    O `lru_cache` em memória some a cada restart, e o Nominatim limita a
    1 req/s.

## P2 — produção

11. `user_agent` real do Nominatim em `app/services/geocoding.py` (exigência
    de uso deles).
12. CORS restrito ao domínio do frontend (hoje `allow_origins=["*"]`).
13. Deploy no Railway (`railway.json` e `Procfile` já prontos).
14. **Paywall** — modelo de negócio ainda em aberto. Sugestão do design:
    liberar leitura diária e mapa; travar conversa ilimitada e sinastria.
    A tela ainda não existe.
15. Ícones **Lucide** no lugar dos glifos placeholder da tab bar.
16. Notificação diária (o Perfil mostra 07:30 fixo, sem seletor).
17. Acessibilidade: alvos ≥44px, contraste (vermelho sobre fundo claro só em
    texto grande — corpo em `--color-accent-700`), rótulos de leitor de tela
    nos ícones.

## Não fazer

- Não arredondar cantos. Não centralizar rótulo de botão. Não trocar Archivo.
- Não apresentar o sistema egípcio como astronomia do Egito antigo.
- Não esconder a incerteza da hora desconhecida — a faixa de aviso e as tags
  APROXIMADO são requisito, não enfeite.
