import { NextResponse } from 'next/server';
import type { ApiErro, CodigoErro } from '@shared/types/api';

/**
 * Erro com código de negócio. O app decide a tela pelo `codigo`,
 * nunca pelo texto — ver TAREFAS P0 item 4 (telas de erro).
 */
export class ErroApi extends Error {
  constructor(
    public codigo: CodigoErro,
    mensagem: string,
    public status: number,
    public detalhe?: unknown,
  ) {
    super(mensagem);
    this.name = 'ErroApi';
  }
}

const emDev = process.env.NODE_ENV !== 'production';

export function respostaDeErro(erro: unknown): NextResponse<ApiErro> {
  if (erro instanceof ErroApi) {
    return NextResponse.json<ApiErro>(
      {
        erro: {
          codigo: erro.codigo,
          mensagem: erro.message,
          ...(emDev && erro.detalhe !== undefined ? { detalhe: erro.detalhe } : {}),
        },
      },
      { status: erro.status },
    );
  }

  console.error('[erro nao tratado]', erro);
  return NextResponse.json<ApiErro>(
    {
      erro: {
        codigo: 'ERRO_INTERNO',
        mensagem: 'Algo deu errado do nosso lado. Tente de novo em instantes.',
        ...(emDev ? { detalhe: String(erro) } : {}),
      },
    },
    { status: 500 },
  );
}

/** Stub para as rotas que ainda não existem (Claude API, Supabase). */
export function naoImplementado(oQueFalta: string): NextResponse<ApiErro> {
  return NextResponse.json<ApiErro>(
    {
      erro: {
        codigo: 'NAO_IMPLEMENTADO',
        mensagem: `Ainda não implementado: ${oQueFalta}.`,
      },
    },
    { status: 501 },
  );
}
