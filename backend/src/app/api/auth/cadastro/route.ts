import { NextResponse } from 'next/server';
import type { AuthResponse, Perfil } from '@shared/types/api';
import { clienteAdmin } from '@/lib/supabase';
import { ErroApi, respostaDeErro } from '@/lib/errors';
import { cadastroSchema, lerCorpo } from '@/lib/validation';
import { calcularEPersistirMapaNatal } from '@/lib/mapasNatais';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/auth/cadastro
 *
 * Corpo: `CadastroRequest` (@shared/types/api) — e-mail, senha, nome + os
 * mesmos campos do onboarding (data/hora de nascimento, cidade, país).
 *
 * Cria a conta no Supabase Auth (e-mail/senha, sem confirmação por e-mail —
 * não há magic link/OAuth por enquanto) E a linha em `perfis` numa única
 * chamada, para o app já sair do onboarding com sessão ativa. Se a criação do
 * perfil falhar depois do usuário criado no Auth, o usuário órfão é apagado
 * (evita conta sem perfil, sem exigir transação entre dois serviços).
 *
 * Resposta 201: `AuthResponse` — `sessao` (access_token/refresh_token, o app
 * guarda e manda como `Authorization: Bearer <access_token>`) + `perfil` +
 * `mapa` (os 3 sistemas, calculados na hora a partir dos dados informados;
 * `null` se o cálculo falhar — a conta ainda é criada, ver
 * `lib/mapasNatais.ts`).
 *
 * Erros:
 * - 400 ENTRADA_INVALIDA — corpo inválido (zod).
 * - 409 EMAIL_JA_CADASTRADO — já existe conta com esse e-mail.
 * - 503 ERRO_INTERNO — Supabase não configurado (SUPABASE_URL/SERVICE_ROLE_KEY ausentes).
 */
export async function POST(req: Request) {
  try {
    const entrada = await lerCorpo(req, cadastroSchema);
    const supabase = clienteAdmin();

    const { data: criado, error: erroCriacao } = await supabase.auth.admin.createUser({
      email: entrada.email,
      password: entrada.senha,
      email_confirm: true,
    });

    if (erroCriacao || !criado?.user) {
      const jaExiste =
        erroCriacao?.code === 'email_exists' ||
        erroCriacao?.status === 422 ||
        /already registered|already exists/i.test(erroCriacao?.message ?? '');
      if (jaExiste) {
        throw new ErroApi(
          'EMAIL_JA_CADASTRADO',
          'Esse e-mail já tem uma conta. Tente entrar.',
          409,
          erroCriacao?.message,
        );
      }
      throw new ErroApi(
        'ERRO_INTERNO',
        'Não conseguimos criar sua conta agora. Tente de novo em instantes.',
        500,
        erroCriacao?.message,
      );
    }

    const usuarioId = criado.user.id;

    const { data: perfil, error: erroPerfil } = await supabase
      .from('perfis')
      .insert({
        id: usuarioId,
        nome: entrada.nome,
        data_nascimento: entrada.data_nascimento,
        hora_nascimento: entrada.hora_desconhecida ? null : entrada.hora_nascimento,
        hora_desconhecida: entrada.hora_desconhecida,
        cidade: entrada.cidade,
        pais: entrada.pais,
      })
      .select('id, nome, data_nascimento, hora_nascimento, hora_desconhecida, cidade, pais, criado_em')
      .single();

    if (erroPerfil || !perfil) {
      // Evita usuário órfão no Auth sem perfil correspondente.
      await supabase.auth.admin.deleteUser(usuarioId);
      throw new ErroApi(
        'ERRO_INTERNO',
        'Não conseguimos salvar seu perfil agora. Tente de novo.',
        500,
        erroPerfil?.message,
      );
    }

    const { data: sessaoData, error: erroSessao } = await supabase.auth.signInWithPassword({
      email: entrada.email,
      password: entrada.senha,
    });

    if (erroSessao || !sessaoData?.session) {
      throw new ErroApi(
        'ERRO_INTERNO',
        'Conta criada, mas não conseguimos iniciar sua sessão. Tente entrar.',
        500,
        erroSessao?.message,
      );
    }

    const mapa = await calcularEPersistirMapaNatal(usuarioId, {
      data_nascimento: entrada.data_nascimento,
      hora_nascimento: entrada.hora_nascimento,
      hora_desconhecida: entrada.hora_desconhecida,
      cidade: entrada.cidade,
      pais: entrada.pais,
    });

    return NextResponse.json<AuthResponse>(
      {
        sessao: {
          access_token: sessaoData.session.access_token,
          refresh_token: sessaoData.session.refresh_token,
          expira_em: sessaoData.session.expires_at ?? 0,
        },
        perfil: perfil as Perfil,
        mapa,
      },
      { status: 201 },
    );
  } catch (erro) {
    return respostaDeErro(erro);
  }
}
