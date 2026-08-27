-- TRÍADE — schema inicial do Supabase.
--
-- Como rodar:
--   1. Supabase Studio → SQL Editor → colar este arquivo inteiro → Run.
--   2. Ou via CLI: `supabase db push` (com este arquivo em `supabase/migrations/`,
--      renomeado para `0001_init.sql`), ou `psql "$DATABASE_URL" -f schema.sql`.
--
-- Idempotente o suficiente para reexecução em dev (usa IF NOT EXISTS / OR REPLACE
-- onde dá), mas pensado para rodar uma vez num projeto novo. Se o schema mudar,
-- crie um novo arquivo de migração — não edite este depois que já tiver rodado
-- em produção.

create extension if not exists pgcrypto; -- gen_random_uuid()

-- ---------------------------------------------------------------------------
-- perfis — id = auth.users.id. Fonte da verdade dos dados de nascimento
-- (CLAUDE.md, "Estado necessário": usuario → onboarding → Supabase).
-- ---------------------------------------------------------------------------
create table if not exists perfis (
  id uuid primary key references auth.users (id) on delete cascade,
  nome text not null,
  data_nascimento date not null,
  -- null quando hora_desconhecida = true (o serviço de cálculo assume meio-dia
  -- nesse caso, mas não persistimos um valor inventado aqui).
  hora_nascimento time,
  hora_desconhecida boolean not null default false,
  cidade text not null,
  pais text not null,
  criado_em timestamptz not null default now()
);

alter table perfis enable row level security;

create policy "perfis_select_own" on perfis
  for select using (auth.uid() = id);
create policy "perfis_insert_own" on perfis
  for insert with check (auth.uid() = id);
create policy "perfis_update_own" on perfis
  for update using (auth.uid() = id) with check (auth.uid() = id);
create policy "perfis_delete_own" on perfis
  for delete using (auth.uid() = id);

-- ---------------------------------------------------------------------------
-- mapas_natais — cache dos 3 JSONs de cálculo (astro-calc-service), 1 linha
-- por perfil. jsonb é aceitável aqui: é cache do resultado de um cálculo
-- determinístico, não fonte relacional (CLAUDE.md, contrato de dados).
--
-- Escrito por POST /api/auth/cadastro (calcula na hora, a partir dos dados
-- de nascimento que acabaram de ser informados) e lido por POST
-- /api/auth/login e pelas rotas de interpretação — ver lib/mapasNatais.ts.
-- As rotas /api/calcular/* continuam proxy puro e NÃO escrevem aqui de
-- propósito: o mesmo endpoint calcula o mapa de uma segunda pessoa na
-- Sinastria, e isso nunca pode sobrescrever o mapa do usuário logado.
-- ---------------------------------------------------------------------------
create table if not exists mapas_natais (
  id uuid primary key default gen_random_uuid(),
  perfil_id uuid not null references perfis (id) on delete cascade,
  -- resposta inteira de POST /calcular/mapa-ocidental
  ocidental jsonb not null,
  -- resposta inteira de POST /calcular/signo-chines
  chines jsonb not null,
  -- resposta inteira de POST /calcular/sistema-egipcio
  egipcio jsonb not null,
  atualizado_em timestamptz not null default now(),
  unique (perfil_id)
);

alter table mapas_natais enable row level security;

create policy "mapas_natais_select_own" on mapas_natais
  for select using (auth.uid() = perfil_id);
create policy "mapas_natais_insert_own" on mapas_natais
  for insert with check (auth.uid() = perfil_id);
create policy "mapas_natais_update_own" on mapas_natais
  for update using (auth.uid() = perfil_id) with check (auth.uid() = perfil_id);
create policy "mapas_natais_delete_own" on mapas_natais
  for delete using (auth.uid() = perfil_id);

-- ---------------------------------------------------------------------------
-- leituras_diarias — cache da leitura do dia (bloco pôster + 3 frases), por
-- (perfil_id, data). Gerada por POST /api/interpretacao/leitura-diaria.
-- ---------------------------------------------------------------------------
create table if not exists leituras_diarias (
  id uuid primary key default gen_random_uuid(),
  perfil_id uuid not null references perfis (id) on delete cascade,
  data date not null,
  sintese text not null,
  apoio text not null,
  -- { ocidental: string, chines: string, egipcio: string }
  frases jsonb not null,
  criado_em timestamptz not null default now(),
  unique (perfil_id, data)
);

alter table leituras_diarias enable row level security;

create policy "leituras_diarias_select_own" on leituras_diarias
  for select using (auth.uid() = perfil_id);
create policy "leituras_diarias_insert_own" on leituras_diarias
  for insert with check (auth.uid() = perfil_id);
create policy "leituras_diarias_update_own" on leituras_diarias
  for update using (auth.uid() = perfil_id) with check (auth.uid() = perfil_id);
create policy "leituras_diarias_delete_own" on leituras_diarias
  for delete using (auth.uid() = perfil_id);

-- ---------------------------------------------------------------------------
-- interpretacoes_signos — cache PERMANENTE (2 parágrafos por sistema, sobre a
-- pessoa). Regenera só quando mapas_natais.atualizado_em fica mais recente que
-- a linha correspondente aqui (comparado em código, não em trigger).
-- ---------------------------------------------------------------------------
create table if not exists interpretacoes_signos (
  id uuid primary key default gen_random_uuid(),
  perfil_id uuid not null references perfis (id) on delete cascade,
  sistema text not null check (sistema in ('ocidental', 'chines', 'egipcio')),
  -- string[] com os parágrafos
  paragrafos jsonb not null,
  atualizado_em timestamptz not null default now(),
  unique (perfil_id, sistema)
);

alter table interpretacoes_signos enable row level security;

create policy "interpretacoes_signos_select_own" on interpretacoes_signos
  for select using (auth.uid() = perfil_id);
create policy "interpretacoes_signos_insert_own" on interpretacoes_signos
  for insert with check (auth.uid() = perfil_id);
create policy "interpretacoes_signos_update_own" on interpretacoes_signos
  for update using (auth.uid() = perfil_id) with check (auth.uid() = perfil_id);
create policy "interpretacoes_signos_delete_own" on interpretacoes_signos
  for delete using (auth.uid() = perfil_id);

-- ---------------------------------------------------------------------------
-- mensagens — histórico da Conversa (streaming). Uma linha por mensagem,
-- tanto do usuário quanto da IA.
-- ---------------------------------------------------------------------------
create table if not exists mensagens (
  id uuid primary key default gen_random_uuid(),
  perfil_id uuid not null references perfis (id) on delete cascade,
  papel text not null check (papel in ('usuario', 'triade')),
  texto text not null,
  criado_em timestamptz not null default now()
);

create index if not exists mensagens_perfil_criado_em_idx
  on mensagens (perfil_id, criado_em);

alter table mensagens enable row level security;

create policy "mensagens_select_own" on mensagens
  for select using (auth.uid() = perfil_id);
create policy "mensagens_insert_own" on mensagens
  for insert with check (auth.uid() = perfil_id);
-- Sem update/delete: histórico de conversa é append-only por design.

-- ---------------------------------------------------------------------------
-- sinastrias — cruzamento entre dois perfis. `perfil_id_b` é opcional: quando
-- a outra pessoa não tem conta no TRÍADE ("Digitar dados", CLAUDE.md tela 6),
-- os dados dela vivem só dentro de `dados` (jsonb).
--
-- Fórmula do percentual/cruzamento ainda não definida (CLAUDE.md, TAREFAS P1
-- item 8) — esta tabela só guarda o resultado já calculado, quando existir.
-- ---------------------------------------------------------------------------
create table if not exists sinastrias (
  id uuid primary key default gen_random_uuid(),
  perfil_id_a uuid not null references perfis (id) on delete cascade,
  perfil_id_b uuid references perfis (id) on delete set null,
  dados jsonb not null,
  criado_em timestamptz not null default now()
);

alter table sinastrias enable row level security;

-- Só o dono do cruzamento (quem pediu a sinastria) vê/edita — não expomos
-- automaticamente para perfil_id_b, mesmo quando ele existe.
create policy "sinastrias_select_own" on sinastrias
  for select using (auth.uid() = perfil_id_a);
create policy "sinastrias_insert_own" on sinastrias
  for insert with check (auth.uid() = perfil_id_a);
create policy "sinastrias_update_own" on sinastrias
  for update using (auth.uid() = perfil_id_a) with check (auth.uid() = perfil_id_a);
create policy "sinastrias_delete_own" on sinastrias
  for delete using (auth.uid() = perfil_id_a);

-- ---------------------------------------------------------------------------
-- geocoding_cache — cidade+país → lat/long/timezone (CLAUDE.md, TAREFAS P1
-- item 10). Cache COMPARTILHADO entre usuários, não é dado de ninguém —
-- RLS ligado mas SEM policy nenhuma: anon/authenticated ficam sem nenhum
-- acesso (deny-by-default do Postgres RLS); só a service_role (que ignora RLS)
-- consegue ler/escrever.
--
-- TODO (P1 item 10, melhoria futura): o astro-calc-service (Python) não fala
-- com o Supabase hoje — o `lru_cache` em memória dele já resolve o caso comum
-- sozinho, mas some a cada restart e não é compartilhado entre instâncias.
-- Ligar isso é trabalho separado (endpoint novo no backend Next.js que o
-- serviço Python consulta antes do Nominatim, ou o próprio Python ganhar um
-- cliente Supabase) — não fazer parte do astro-calc-service sem alinhar com o
-- especialista responsável por aquele serviço.
-- ---------------------------------------------------------------------------
create table if not exists geocoding_cache (
  id uuid primary key default gen_random_uuid(),
  cidade text not null,
  pais text not null,
  latitude double precision not null,
  longitude double precision not null,
  timezone_iana text not null,
  criado_em timestamptz not null default now(),
  unique (cidade, pais)
);

alter table geocoding_cache enable row level security;
-- (Nenhuma policy de propósito — ver comentário acima.)
