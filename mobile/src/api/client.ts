import type { DadosNascimento, MapaOcidental, SignoChines, SistemaEgipcio } from '@shared/types/astro';
import type {
  ApiErro,
  AuthResponse,
  CadastroRequest,
  CodigoErro,
  InterpretacaoSignos,
  LeituraDiaria,
  LoginRequest,
} from '@shared/types/api';

/**
 * Cliente do backend Next.js. É a ÚNICA porta de saída de rede do app.
 * O app não conhece o astro-calc-service, a Gemini nem o Supabase.
 */

const BASE = process.env.EXPO_PUBLIC_BACKEND_URL ?? 'http://localhost:3000';

/** Erro já traduzido: a UI decide a tela pelo `codigo`, nunca pelo texto. */
export class ErroTriade extends Error {
  constructor(
    public codigo: CodigoErro,
    mensagem: string,
  ) {
    super(mensagem);
    this.name = 'ErroTriade';
  }
}

/**
 * Token de acesso atual (Supabase Auth). `PerfilContext` é o dono da sessão —
 * ele chama `definirToken` sempre que a sessão muda (login, cadastro, hidratação
 * do AsyncStorage no cold start, logout). Vive fora do React de propósito: é o
 * único jeito simples de fazer o token chegar até aqui sem passar `token` em
 * toda chamada de tela.
 */
let tokenAtual: string | null = null;

export function definirToken(token: string | null): void {
  tokenAtual = token;
}

async function tratarResposta<T>(resposta: Response): Promise<T> {
  if (!resposta.ok) {
    let payload: ApiErro | null = null;
    try {
      payload = (await resposta.json()) as ApiErro;
    } catch {
      payload = null;
    }
    throw new ErroTriade(
      payload?.erro.codigo ?? 'ERRO_INTERNO',
      payload?.erro.mensagem ?? 'Algo deu errado. Tente de novo.',
    );
  }
  return (await resposta.json()) as T;
}

async function post<T>(caminho: string, corpo?: unknown, autenticado = false): Promise<T> {
  let resposta: Response;
  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (autenticado && tokenAtual) headers.Authorization = `Bearer ${tokenAtual}`;

    resposta = await fetch(`${BASE}${caminho}`, {
      method: 'POST',
      headers,
      body: corpo !== undefined ? JSON.stringify(corpo) : undefined,
    });
  } catch {
    throw new ErroTriade(
      'SERVICO_INDISPONIVEL',
      'Não conseguimos conectar. Verifique sua internet e tente de novo.',
    );
  }

  return tratarResposta<T>(resposta);
}

/** Um pedaço de texto recebido pelo stream, ou o fim da resposta. */
export type PedacoConversa = { tipo: 'delta'; texto: string } | { tipo: 'fim' };

/**
 * Consome `POST /api/conversa` como stream SSE (`text/event-stream`).
 * Cada evento chega como `data: {"delta":"..."}\n\n`, terminando em
 * `data: [DONE]\n\n`. Se a Gemini falhar ANTES do stream começar, a resposta
 * é um JSON de erro comum (`ApiErro`, não streaming) — tratado do mesmo jeito
 * que qualquer outro erro (`ErroTriade`).
 *
 * `onPedaco` é chamado a cada delta, incrementalmente — quem chama decide como
 * acumular o texto (efeito de "digitando").
 */
export async function conversaStream(
  mensagem: string,
  onPedaco: (pedaco: PedacoConversa) => void,
): Promise<void> {
  let resposta: Response;
  try {
    resposta = await fetch(`${BASE}/api/conversa`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(tokenAtual ? { Authorization: `Bearer ${tokenAtual}` } : {}),
      },
      body: JSON.stringify({ mensagem }),
    });
  } catch {
    throw new ErroTriade(
      'SERVICO_INDISPONIVEL',
      'Não conseguimos conectar. Verifique sua internet e tente de novo.',
    );
  }

  const contentType = resposta.headers.get('content-type') ?? '';

  // Erro antes do stream começar: JSON normal, não SSE.
  if (!resposta.ok || !contentType.includes('text/event-stream')) {
    await tratarResposta<unknown>(resposta);
    // tratarResposta sempre lança quando !resposta.ok; se por algum motivo
    // chegou aqui com 200 e sem stream, não há o que fazer além de terminar.
    onPedaco({ tipo: 'fim' });
    return;
  }

  if (!resposta.body) {
    onPedaco({ tipo: 'fim' });
    return;
  }

  const leitor = resposta.body.getReader();
  const decodificador = new TextDecoder();
  let buffer = '';

  for (;;) {
    const { done, value } = await leitor.read();
    if (done) break;
    buffer += decodificador.decode(value, { stream: true });

    let indiceSeparador: number;
    // Eventos SSE são separados por linha em branco dupla.
    while ((indiceSeparador = buffer.indexOf('\n\n')) !== -1) {
      const bruto = buffer.slice(0, indiceSeparador).trim();
      buffer = buffer.slice(indiceSeparador + 2);
      if (!bruto.startsWith('data:')) continue;

      const dado = bruto.slice('data:'.length).trim();
      if (dado === '[DONE]') {
        onPedaco({ tipo: 'fim' });
        return;
      }
      try {
        const json = JSON.parse(dado) as { delta?: string };
        if (typeof json.delta === 'string' && json.delta.length > 0) {
          onPedaco({ tipo: 'delta', texto: json.delta });
        }
      } catch {
        // Linha malformada: ignora e segue lendo o stream.
      }
    }
  }

  onPedaco({ tipo: 'fim' });
}

export const api = {
  // ---------------------------------------------------------------------
  // Autenticação (Supabase Auth — e-mail/senha)
  // ---------------------------------------------------------------------

  /** Cria a conta + calcula o mapa na hora. `mapa` pode vir `null` (conta OK, cálculo falhou). */
  cadastro: (dados: CadastroRequest) => post<AuthResponse>('/api/auth/cadastro', dados),

  /** `mapa` vem do cache em `mapas_natais`. */
  login: (dados: LoginRequest) => post<AuthResponse>('/api/auth/login', dados),

  // ---------------------------------------------------------------------
  // Cálculo puro — sem autenticação, proxy pro astro-calc-service.
  // Usado hoje só pela Sinastria (segunda pessoa) e por `tentarRecalcularMapa`
  // (retry client-side quando o cadastro não conseguiu calcular).
  // ---------------------------------------------------------------------

  mapaOcidental: (dados: DadosNascimento) =>
    post<MapaOcidental>('/api/calcular/mapa-ocidental', dados),

  signoChines: (data_nascimento: string) =>
    post<SignoChines>('/api/calcular/signo-chines', { data_nascimento }),

  sistemaEgipcio: (data_nascimento: string) =>
    post<SistemaEgipcio>('/api/calcular/sistema-egipcio', { data_nascimento }),

  // ---------------------------------------------------------------------
  // Interpretação (Gemini) — exigem `Authorization: Bearer`, sem corpo: o
  // backend busca o mapa direto de `mapas_natais` pelo token.
  // ---------------------------------------------------------------------

  leituraDiaria: () => post<LeituraDiaria>('/api/interpretacao/leitura-diaria', undefined, true),

  interpretacaoSignos: () =>
    post<InterpretacaoSignos>('/api/interpretacao/signos', undefined, true),

  // Conversa: ver `conversaStream` acima (streaming SSE).
};
