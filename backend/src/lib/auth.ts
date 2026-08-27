/**
 * Autenticação simples via Supabase Auth (e-mail/senha).
 *
 * O app manda `Authorization: Bearer <access_token>` (o token que
 * `POST /api/auth/cadastro` ou `POST /api/auth/login` devolveram). Toda rota
 * que precisa saber "de quem" são os dados chama `usuarioAutenticado(request)`.
 */

import { clienteAdmin } from './supabase';
import { ErroApi } from './errors';

export interface UsuarioAutenticado {
  /** = `auth.users.id` = `perfis.id`. */
  usuarioId: string;
  email?: string;
}

function extrairToken(request: Request): string | null {
  const cabecalho = request.headers.get('authorization') ?? request.headers.get('Authorization');
  if (!cabecalho) return null;
  const match = cabecalho.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || null;
}

/**
 * Valida o `Authorization: Bearer <token>` contra o Supabase Auth e devolve o
 * id do usuário (= `perfis.id`). Lança `ErroApi('NAO_AUTENTICADO', …, 401)` se
 * o header estiver ausente, malformado, ou o token for inválido/expirado — as
 * rotas chamadoras não precisam tratar isso além de deixar o erro propagar
 * para `respostaDeErro`.
 */
export async function usuarioAutenticado(request: Request): Promise<UsuarioAutenticado> {
  const token = extrairToken(request);
  if (!token) {
    throw new ErroApi('NAO_AUTENTICADO', 'Faça login para continuar.', 401);
  }

  const supabase = clienteAdmin();
  const { data, error } = await supabase.auth.getUser(token);

  if (error || !data?.user) {
    throw new ErroApi(
      'NAO_AUTENTICADO',
      'Sessão inválida ou expirada. Entre novamente.',
      401,
      error?.message,
    );
  }

  return { usuarioId: data.user.id, email: data.user.email ?? undefined };
}
