import type {
  DadosNascimento,
  DataNascimentoInput,
  MapaOcidental,
  SignoChines,
  SistemaEgipcio,
} from '@shared/types/astro';
import type { CodigoErro } from '@shared/types/api';
import { ErroApi } from './errors';

/**
 * Cliente do astro-calc-service (FastAPI).
 *
 * Este arquivo é o ÚNICO ponto do backend que conhece a URL e o formato do
 * serviço Python. O app nunca fala com ele direto (ver STACK.md).
 *
 * O serviço só calcula: devolve números e nomes de signo, nunca interpretação.
 */

function baseUrl(): string {
  const url = process.env.ASTRO_CALC_URL;
  if (!url) {
    throw new ErroApi(
      'SERVICO_INDISPONIVEL',
      'Serviço de cálculo não configurado.',
      503,
      'ASTRO_CALC_URL ausente no ambiente.',
    );
  }
  return url.replace(/\/$/, '');
}

function timeoutMs(): number {
  return Number(process.env.ASTRO_CALC_TIMEOUT_MS ?? 20000);
}

interface OpcoesChamada {
  /** Código devolvido quando o serviço responde 422. Muda por endpoint. */
  codigo422: CodigoErro;
  mensagem422: string;
}

async function chamar<T>(
  caminho: string,
  corpo: unknown,
  { codigo422, mensagem422 }: OpcoesChamada,
): Promise<T> {
  const url = `${baseUrl()}${caminho}`;

  let resposta: Response;
  try {
    resposta = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(corpo),
      signal: AbortSignal.timeout(timeoutMs()),
      cache: 'no-store',
    });
  } catch (causa) {
    // Rede caiu, DNS, ou timeout do AbortSignal.
    throw new ErroApi(
      'SERVICO_INDISPONIVEL',
      'Não conseguimos calcular agora. Tente de novo.',
      503,
      String(causa),
    );
  }

  if (resposta.status === 422) {
    throw new ErroApi(codigo422, mensagem422, 422, await lerCorpoSeguro(resposta));
  }

  if (!resposta.ok) {
    throw new ErroApi(
      'SERVICO_INDISPONIVEL',
      'Não conseguimos calcular agora. Tente de novo.',
      502,
      { status: resposta.status, corpo: await lerCorpoSeguro(resposta) },
    );
  }

  return (await resposta.json()) as T;
}

async function lerCorpoSeguro(resposta: Response): Promise<unknown> {
  try {
    return await resposta.json();
  } catch {
    return null;
  }
}

/**
 * Mapa ocidental. Único endpoint que exige o envelope `{ dados: {...} }` —
 * o app manda o objeto plano e o embrulho acontece aqui.
 */
export function calcularMapaOcidental(dados: DadosNascimento): Promise<MapaOcidental> {
  return chamar<MapaOcidental>(
    '/calcular/mapa-ocidental',
    { dados },
    {
      codigo422: 'GEOCODING_FALHOU',
      mensagem422: 'Não encontramos essa cidade. Tente escrever o nome completo.',
    },
  );
}

export function calcularSignoChines(entrada: DataNascimentoInput): Promise<SignoChines> {
  return chamar<SignoChines>('/calcular/signo-chines', entrada, {
    // TAREFAS P0 item 2: a tabela ANO_NOVO_CHINES só cobre 1990-2030.
    // Quem nasceu antes de 1990 cai aqui até a tabela ser estendida.
    codigo422: 'ANO_FORA_DA_TABELA',
    mensagem422: 'Ainda não calculamos o signo chinês para esse ano.',
  });
}

export function calcularSistemaEgipcio(
  entrada: DataNascimentoInput,
): Promise<SistemaEgipcio> {
  return chamar<SistemaEgipcio>('/calcular/sistema-egipcio', entrada, {
    codigo422: 'ENTRADA_INVALIDA',
    mensagem422: 'Não conseguimos ler essa data de nascimento.',
  });
}
