/**
 * Cliente Supabase (server-side, service role).
 *
 * Duas decisões que não mudam:
 * 1. A `service_role` só existe no servidor. Nunca vai para o app.
 * 2. RLS LIGADO em todas as tabelas de usuário (schema em `supabase/schema.sql`).
 *    Este cliente usa a service role e por isso IGNORA RLS de propósito — é o
 *    único lugar do backend com esse poder. Use-o só em route handlers.
 *
 * Autenticação do usuário final (validar o token que o app manda) fica em
 * `lib/auth.ts`, que usa este mesmo cliente para chamar `auth.getUser(token)`.
 *
 * Tabelas (ver `supabase/schema.sql` para o schema completo com RLS):
 *   perfis                 perfil + dados de nascimento (fonte da verdade)
 *   mapas_natais           cache dos 3 JSONs de cálculo, por perfil (1:1)
 *   leituras_diarias       cache da interpretação por (perfil_id, data)
 *   interpretacoes_signos  cache permanente por (perfil_id, sistema)
 *   mensagens              histórico da Conversa
 *   sinastrias             por par de perfis
 *   geocoding_cache        cidade+pais -> lat/long/timezone (P1 item 10;
 *                          cache compartilhado, só service_role — o
 *                          astro-calc-service em Python não fala com o
 *                          Supabase hoje, ver TODO no schema)
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { ErroApi } from './errors';

export interface ConfigSupabase {
  url: string;
  serviceRoleKey: string;
}

export function configSupabase(): ConfigSupabase {
  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    throw new ErroApi(
      'ERRO_INTERNO',
      'Armazenamento indisponível.',
      503,
      'SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY ausentes no ambiente.',
    );
  }
  return { url, serviceRoleKey };
}

let clienteCache: SupabaseClient | null = null;

/**
 * Cliente admin (service role, ignora RLS). Use SÓ em route handlers, nunca em
 * código que possa ir para o cliente. Lança `ErroApi('ERRO_INTERNO', …, 503)`
 * de forma tratada se as variáveis de ambiente ainda não estiverem configuradas
 * — nunca derruba o processo.
 */
export function clienteAdmin(): SupabaseClient {
  if (clienteCache) return clienteCache;
  const { url, serviceRoleKey } = configSupabase();
  clienteCache = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return clienteCache;
}
