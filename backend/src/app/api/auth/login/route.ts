import { NextResponse } from 'next/server';
import type { AuthResponse, Perfil } from '@shared/types/api';
import { clienteAdmin } from '@/lib/supabase';
import { ErroApi, respostaDeErro } from '@/lib/errors';
import { lerCorpo, loginSchema } from '@/lib/validation';
import { buscarMapaNatal } from '@/lib/mapasNatais';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/auth/login
 *
 * Corpo: `LoginRequest` (@shared/types/api) — `{ email, senha }`.
 *
 * Resposta 200: `AuthResponse` — `sessao` (access_token/refresh_token, o app
 * guarda e manda como `Authorization: Bearer <access_token>`) + `perfil` +
 * `mapa` (o que já estiver calculado em `mapas_natais`; `null` se nunca foi
 * calculado — não deveria acontecer hoje, todo cadastro calcula na hora).
 *
 * Erros:
 * - 400 ENTRADA_INVALIDA — corpo inválido (zod).
 * - 401 CREDENCIAIS_INVALIDAS — e-mail ou senha incorretos.
 * - 503 ERRO_INTERNO — Supabase não configurado.
 */
export async function POST(req: Request) {
  try {
    const entrada = await lerCorpo(req, loginSchema);
    const supabase = clienteAdmin();

    const { data, error } = await supabase.auth.signInWithPassword({
      email: entrada.email,
      password: entrada.senha,
    });

    if (error || !data?.session || !data.user) {
      throw new ErroApi('CREDENCIAIS_INVALIDAS', 'E-mail ou senha incorretos.', 401, error?.message);
    }

    const { data: perfil, error: erroPerfil } = await supabase
      .from('perfis')
      .select('id, nome, data_nascimento, hora_nascimento, hora_desconhecida, cidade, pais, criado_em')
      .eq('id', data.user.id)
      .single();

    if (erroPerfil || !perfil) {
      throw new ErroApi(
        'ERRO_INTERNO',
        'Login feito, mas não encontramos seu perfil. Fale com o suporte.',
        500,
        erroPerfil?.message,
      );
    }

    const mapa = await buscarMapaNatal(data.user.id);

    return NextResponse.json<AuthResponse>({
      sessao: {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
        expira_em: data.session.expires_at ?? 0,
      },
      perfil: perfil as Perfil,
      mapa,
    });
  } catch (erro) {
    return respostaDeErro(erro);
  }
}
