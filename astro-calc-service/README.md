# astro-calc-service

Serviço FastAPI que **calcula** (nunca interpreta) os três sistemas do
TRÍADE: mapa astrológico ocidental, signo do zodíaco chinês e sistema
egípcio moderno. Implementa o contrato de dados da PARTE 2 do `CLAUDE.md`
do projeto.

## Rodar localmente

```bash
python -m venv .venv
.venv\Scripts\activate        # Windows
# source .venv/bin/activate   # Linux/Mac

pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

Endpoints disponíveis em `http://localhost:8000`:

| Método | Rota |
| --- | --- |
| POST | `/calcular/mapa-ocidental` |
| POST | `/calcular/signo-chines` |
| POST | `/calcular/sistema-egipcio` |
| GET | `/health` |

## Rodar os testes

```bash
pytest -v
```

31 testes, todos offline (não dependem de rede) exceto o próprio uso manual
do geocoding descrito abaixo.

## Bibliotecas usadas e por quê

### Cálculo astronômico: `pymeeus`, não `pyswisseph`

O pedido original era `pyswisseph` (Swiss Ephemeris). **Não foi possível
instalá-la no ambiente onde este serviço foi construído**: ela compila uma
extensão C (`swisseph`) e não há Microsoft C++ Build Tools disponível nesta
máquina, nem existe wheel pré-compilado no PyPI para Windows/Python 3.12 no
momento (`pip install pyswisseph` falha com *"Microsoft Visual C++ 14.0 or
greater is required"*). `flatlib` foi cogitada como alternativa, mas usa
`pyswisseph` por baixo — mesmo problema.

A alternativa escolhida foi **`pymeeus`** (pacote `PyMeeus`), que implementa
em Python puro os algoritmos astronômicos clássicos do livro *"Astronomical
Algorithms"* de Jean Meeus: VSOP87 para os planetas, ELP2000-82 para a Lua.
Não exige compilador nem download de arquivos de efemérides externos (o
equivalente ao modo "Moshier" pedido no briefing, mas com outra biblioteca).

**Precisão**: comparando com os *doctests* do próprio pymeeus (retirados do
livro do Meeus) e com fatos de referência conhecidos, as posições batem na
casa de segundos de arco:

- Sol em 2000-01-01 12:00 UT: `280.368°` (referência conhecida: `~280.4°`).
- GMST em J2000.0: `280.457°` calculado vs. `280.4606°` de referência —
  diferença de ~1 segundo de arco.
- Mercúrio em 1992-12-20 (exemplo do próprio pymeeus): RA/Dec calculados a
  partir da nossa conversão heliocêntrica→geocêntrica batem com o doctest
  original a menos de 1 segundo de arco.
- O exemplo ilustrativo do próprio `CLAUDE.md` (nascimento 1990-05-15
  14:20, Rio de Janeiro) — que aparentemente foi gerado com uma efeméride
  de verdade — bate quase exatamente com o resultado deste serviço: Sol em
  Touro 24.61° (doc: 24.31°), Ascendente em Virgem (doc: Virgem), Meio-céu
  em Gêmeos (doc: Gêmeos).

Isso é muito acima da resolução que qualquer leitura de signo/casa ou orbe
de aspecto (6-8°) precisa.

### Sistema de casas: Placidus calculado do zero

Sem Swiss Ephemeris, não há função pronta de casas Placidus. Implementado
em `app/calculators/western.py` a partir da definição clássica (divisão do
arco diurno/noturno de cada cúspide em frações de tempo iguais), resolvida
por iteração de ponto fixo em ascensão reta. Ascendente e Meio-céu são
calculados por fórmula fechada (Meio-céu) e por interseção vetorial de
planos — Ascendente é a interseção do plano da eclíptica com o plano do
horizonte local, resolvida via produto vetorial dos vetores normais dos
dois planos, escolhendo a raiz do lado nascente pelo ângulo horário. Essa
abordagem vetorial foi adotada depois de descobrir, durante os testes
manuais, que a fórmula trigonométrica fechada mais comum para o Ascendente
(`tan(Asc) = -cos(RAMC) / (sin ε tan φ + cos ε sin RAMC)`) tem ambiguidade
de quadrante e devolvia o Descendente em alguns casos — o método vetorial
não tem essa ambiguidade.

Validação feita (ver `tests/test_western.py`): para 5 cidades em latitudes
bem diferentes (Rio, Londres, Nova York, Tóquio, Sydney), as 12 cúspides
sempre fecham exatamente 360°, casas opostas (n, n+6) ficam exatamente a
180° uma da outra, e a casa 1 bate com o Ascendente e a casa 10 com o
Meio-céu.

**Limitação conhecida**: em latitudes muito altas (> ~66°, círculo polar),
o sistema Placidus não tem solução matemática para algumas cúspides (o
"arco diurno" de certos pontos nunca cruza o horizonte). Esse caso extremo
não tem tratamento especial aqui — a iteração pode não convergir de forma
sensata. Não é um caso de uso relevante para o público do TRÍADE, mas fica
registrado.

**ΔT (diferença TT-UT) é ignorado de propósito.** Os cálculos tratam o
horário UTC de entrada como se já fosse Tempo Terrestre. No intervalo
1900-2035 essa diferença é de segundos a pouco mais de um minuto — o erro
de posição que isso introduz é irrelevante frente aos orbes de aspecto
(graus) usados em astrologia.

### Geocoding: Nominatim + `timezonefinder`

`app/services/geocoding.py` usa a API pública do Nominatim
(OpenStreetMap) com:
- **User-Agent identificável** (`TriadeAstroCalcService/1.0 (+https://...)`),
  exigência de uso deles.
- **Rate limit de 1 req/s** (lock + timestamp da última chamada).
- **`lru_cache`** para não repetir a mesma consulta na vida do processo.

O fuso horário IANA vem de `timezonefinder`, a partir de latitude/longitude
— testado com sucesso distinguindo os fusos dentro do próprio Brasil
(`America/Sao_Paulo`, `America/Bahia`, `America/Recife`).

No Windows, `zoneinfo` (usado para converter hora local → UTC) depende do
pacote `tzdata` instalado via pip (o Windows não vem com o banco de dados
IANA embutido). Está no `requirements.txt`; em produção Linux ele também
não faz mal ter instalado.

### Signo chinês: tabela `ANO_NOVO_CHINES` via `lunardate`

Em vez de transcrever manualmente 136 datas de Ano Novo Chinês (1900-2035),
`app/calculators/chinese.py` gera a tabela programaticamente com a
biblioteca `lunardate`, que embute a mesma tabela de informação lunar
1900-2099 (derivada do projeto `lunar` de F. Lee/R. Yeung) usada por várias
calculadoras de calendário chinês de referência. Isso elimina o risco de
erro de transcrição. Uma amostra das datas geradas foi conferida à mão
contra fatos de calendário chinês de conhecimento público:

| Ano | Ano Novo Chinês calculado | Fato de referência |
| --- | --- | --- |
| 1900 | 31/01/1900 | Ano do Rato ("Gengzi") — bate |
| 1962 | 05/02/1962 | Citado no CLAUDE.md como o caso de teste do corte |
| 1984 | 02/02/1984 | Início do ciclo sexagenário "Jiǎzǐ" — bate |
| 2000 | 05/02/2000 | — |
| 2023 | 22/01/2023 | Ano do Coelho — bate |
| 2024 | 10/02/2024 | Ano do Dragão de Madeira — bate |

O tronco celeste e o ramo terrestre são derivados por aritmética modular a
partir da mesma âncora (1984 = Rato de Madeira Yang = início do ciclo
"Jiǎzǐ", tronco `Jia`, ramo `Zi`). O exemplo do design no CLAUDE.md
("Tronco Geng · Ramo Wu") bate exatamente para o ano 1990.

## Limitações e TODOs conhecidos

- **CORS liberado (`allow_origins=["*"]`)** — `# TODO P2` marcado em
  `main.py`, restringir ao domínio do frontend em produção.
- **Rate-limit e cache de geocoding em memória de processo único.** Em
  produção com múltiplos workers, isso precisa de um limitador/cache
  compartilhado (Redis) — anotado em `app/services/geocoding.py`. O cache
  persistente entre reinícios (Supabase) é responsabilidade do backend
  Next.js, não deste serviço (P1 item 10 do CLAUDE.md).
- **ΔT ignorado** (ver acima) — aceitável para o intervalo de datas de
  nascimento suportado.
- **Placidus em latitudes polares** não tem tratamento especial (ver acima).
- **Trânsitos diários (P1 item 6 do CLAUDE.md)** não fazem parte deste
  pacote — não foram pedidos nesta tarefa.

## Testes manuais rodados (ponta a ponta, com internet real)

Servidor local (`uvicorn main:app --port 8000`), testado com `curl`:

- `POST /calcular/mapa-ocidental` com o exemplo do CLAUDE.md
  (1990-05-15, 14:20, Rio de Janeiro, Brasil) → 200, todos os campos do
  contrato presentes, Sol em Touro 24.61° (doc: 24.31°), Ascendente em
  Virgem (doc: Virgem), Meio-céu em Gêmeos (doc: Gêmeos).
- Mesmo endpoint com `hora_desconhecida: true` → `hora_confiavel: false`,
  hora de cálculo = meio-dia local convertido corretamente para UTC.
- `POST /calcular/signo-chines` com 1990-05-15 → Cavalo, Metal, Yang,
  ano_efetivo 1990, Tronco Geng, Ramo Wu — bate exatamente com os dois
  exemplos do CLAUDE.md (contrato de dados e mockup de design).
- Mesmo endpoint com 1962-02-05 → Tigre (o caso de teste do corte de Ano
  Novo Chinês citado explicitamente no briefing).
- `POST /calcular/sistema-egipcio` com 1990-05-15 → Toth, "09/05 a 02/06",
  bate exatamente com o exemplo do CLAUDE.md.
- Erros: cidade inexistente → `422 GEOCODING_FALHOU`; ano fora da tabela
  chinesa (1850) → `422 ANO_FORA_DA_TABELA`; data malformada → `422
  ENTRADA_INVALIDA`.
- Geocoding real (Nominatim) testado para 5 cidades brasileiras (Rio de
  Janeiro, São Paulo, Salvador, Belo Horizonte, Recife) e 3 estrangeiras
  (Lisboa, Tóquio, Nova York) — todas resolveram latitude/longitude e
  timezone IANA corretos, inclusive distinguindo os três fusos horários do
  Brasil (`America/Sao_Paulo`, `America/Bahia`, `America/Recife`).

## Estrutura

```
astro-calc-service/
  main.py                       # FastAPI app, os 3 endpoints
  requirements.txt
  app/
    models.py                   # schemas Pydantic do contrato
    calculators/
      western.py                 # mapa ocidental (VSOP87/ELP2000, Placidus)
      chinese.py                  # signo chinês (calendário lunissolar)
      egyptian.py                  # sistema egípcio (tabela de datas fixas)
    services/
      geocoding.py                 # Nominatim + timezonefinder
  tests/
    test_western.py
    test_chinese.py
    test_egyptian.py
```
