/**
 * Integração com a API do Gemini (Google AI Studio) — geração de texto em PT-BR.
 *
 * Todo texto interpretativo do TRÍADE nasce aqui. O astro-calc-service devolve
 * só números e nomes; quem escreve em português é este módulo.
 *
 * Decisão de implementação: REST direta via `fetch`, sem SDK (`@google/genai`
 * não foi adicionado como dependência). Motivo:
 * - O endpoint documentado pelo Google é estável e simples
 *   (`POST /v1beta/models/{modelo}:generateContent`, header `x-goog-api-key`).
 * - `@google/genai` (pacote atual, ativo — substituiu o descontinuado
 *   `@google/generative-ai`) traz `google-auth-library`, `ws` e `protobufjs`
 *   como dependências, pensadas para OAuth/Vertex AI; não precisamos disso
 *   para uma chamada com API key.
 * - Mantém o mesmo padrão já usado em `lib/astroCalc.ts` (fetch +
 *   `AbortSignal.timeout`), sem introduzir um segundo estilo de cliente HTTP.
 * - Streaming da Gemini API expõe SSE nativamente
 *   (`:streamGenerateContent?alt=sse`), que é exatamente o formato que
 *   `POST /api/conversa` precisa repassar ao app.
 *
 * Único ponto de saída para a API do Gemini. Mantenha assim: nenhuma rota deve
 * montar o corpo da requisição ou falar com `generativelanguage.googleapis.com`
 * direto, para que prompt, tom e tratamento de erro fiquem centralizados.
 */

import { ErroApi } from './errors';

export interface ConfigGemini {
  apiKey: string;
  modelo: string;
}

export function configGemini(): ConfigGemini {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new ErroApi(
      'INTERPRETACAO_INDISPONIVEL',
      'Os textos estão indisponíveis agora.',
      503,
      'GEMINI_API_KEY ausente no ambiente.',
    );
  }
  return { apiKey, modelo: process.env.GEMINI_MODEL ?? 'gemini-2.5-flash' };
}

function timeoutMs(): number {
  return Number(process.env.GEMINI_TIMEOUT_MS ?? 30000);
}

function baseUrl(modelo: string, metodo: 'generateContent' | 'streamGenerateContent'): string {
  const sufixoSse = metodo === 'streamGenerateContent' ? '?alt=sse' : '';
  return `https://generativelanguage.googleapis.com/v1beta/models/${modelo}:${metodo}${sufixoSse}`;
}

/** Um turno já ocorrido, para dar contexto multi-turno (usado pela Conversa). */
export interface TurnoConversa {
  papel: 'usuario' | 'triade';
  texto: string;
}

export interface ParametrosGeracao {
  /** Instrução de sistema: tom, regras editoriais, contexto do mapa. */
  systemPrompt: string;
  /** Mensagem/pedido atual. */
  mensagemUsuario: string;
  maxTokens?: number;
  /** Quando `true`, pede à Gemini para responder em JSON puro (`generationConfig.responseMimeType`). */
  respostaJson?: boolean;
  /** Turnos anteriores da conversa, em ordem cronológica (mais antigo primeiro). */
  historico?: TurnoConversa[];
}

function papelParaGemini(papel: TurnoConversa['papel']): 'user' | 'model' {
  return papel === 'usuario' ? 'user' : 'model';
}

function corpoRequisicao(params: ParametrosGeracao) {
  const contents = [
    ...(params.historico ?? []).map((turno) => ({
      role: papelParaGemini(turno.papel),
      parts: [{ text: turno.texto }],
    })),
    { role: 'user' as const, parts: [{ text: params.mensagemUsuario }] },
  ];

  return {
    systemInstruction: { parts: [{ text: params.systemPrompt }] },
    contents,
    generationConfig: {
      maxOutputTokens: params.maxTokens ?? 1024,
      temperature: 0.9,
      ...(params.respostaJson ? { responseMimeType: 'application/json' } : {}),
    },
  };
}

async function lerCorpoSeguro(resposta: Response): Promise<unknown> {
  try {
    return await resposta.json();
  } catch {
    try {
      return await resposta.text();
    } catch {
      return null;
    }
  }
}

/** Extrai o texto concatenado de uma resposta (ou de um evento de stream) do Gemini. */
function extrairTexto(json: unknown): string | null {
  const partes = (json as any)?.candidates?.[0]?.content?.parts;
  if (!Array.isArray(partes)) return null;
  const texto = partes
    .map((p: any) => (typeof p?.text === 'string' ? p.text : ''))
    .join('')
    .trim();
  return texto || null;
}

/**
 * Único ponto de saída (não-streaming) para a API do Gemini. Mantenha assim:
 * nenhuma rota deve montar o corpo da requisição direto.
 *
 * Nunca lança para o chamador travar a rota inteira: falhas de rede, chave
 * ausente ou resposta vazia sempre viram `ErroApi('INTERPRETACAO_INDISPONIVEL', …, 503)`,
 * para a rota poder devolver o cálculo sem o texto (ver `errors.ts`).
 */
export async function gerarTexto(params: ParametrosGeracao): Promise<string> {
  const { apiKey, modelo } = configGemini();

  let resposta: Response;
  try {
    resposta = await fetch(baseUrl(modelo, 'generateContent'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify(corpoRequisicao(params)),
      signal: AbortSignal.timeout(timeoutMs()),
      cache: 'no-store',
    });
  } catch (causa) {
    throw new ErroApi(
      'INTERPRETACAO_INDISPONIVEL',
      'Os textos estão indisponíveis agora.',
      503,
      String(causa),
    );
  }

  if (!resposta.ok) {
    throw new ErroApi(
      'INTERPRETACAO_INDISPONIVEL',
      'Os textos estão indisponíveis agora.',
      503,
      { status: resposta.status, corpo: await lerCorpoSeguro(resposta) },
    );
  }

  const json = await lerCorpoSeguro(resposta);
  const texto = extrairTexto(json);
  if (!texto) {
    throw new ErroApi(
      'INTERPRETACAO_INDISPONIVEL',
      'Os textos estão indisponíveis agora.',
      503,
      { motivo: 'resposta do Gemini sem texto', corpo: json },
    );
  }
  return texto;
}

export interface ResultadoStream {
  /**
   * Stream pronto para repassar direto ao cliente como `text/event-stream`.
   * Cada evento: `data: {"delta":"..."}\n\n`. Termina com `data: [DONE]\n\n`.
   */
  stream: ReadableStream<Uint8Array>;
  /**
   * Resolve com o texto completo quando o stream termina — usar para
   * persistir a resposta em `mensagens` depois de enviada ao app. Rejeita se
   * a geração falhar no meio do caminho (ex.: conexão caiu).
   */
  textoCompleto: Promise<string>;
}

/**
 * Único ponto de saída (streaming) para a API do Gemini. Usado pela Conversa.
 *
 * Diferente de `gerarTexto`, esta função PODE lançar `ErroApi` antes de
 * devolver — a rota chamadora deve tratar isso fora do streaming (ver
 * `api/conversa/route.ts`). Uma vez que o stream começou a ser devolvido ao
 * app, falhas viram o fim silencioso do stream (o app já mostrou algum
 * texto); ver `textoCompleto`, que rejeita nesse caso.
 */
export async function gerarTextoStream(params: ParametrosGeracao): Promise<ResultadoStream> {
  const { apiKey, modelo } = configGemini();

  let respostaGemini: Response;
  try {
    respostaGemini = await fetch(baseUrl(modelo, 'streamGenerateContent'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify(corpoRequisicao(params)),
      signal: AbortSignal.timeout(timeoutMs()),
      cache: 'no-store',
    });
  } catch (causa) {
    throw new ErroApi(
      'INTERPRETACAO_INDISPONIVEL',
      'A conversa está indisponível agora.',
      503,
      String(causa),
    );
  }

  if (!respostaGemini.ok || !respostaGemini.body) {
    throw new ErroApi(
      'INTERPRETACAO_INDISPONIVEL',
      'A conversa está indisponível agora.',
      503,
      { status: respostaGemini.status, corpo: await lerCorpoSeguro(respostaGemini) },
    );
  }

  let resolverTexto!: (texto: string) => void;
  let rejeitarTexto!: (causa: unknown) => void;
  const textoCompleto = new Promise<string>((resolve, reject) => {
    resolverTexto = resolve;
    rejeitarTexto = reject;
  });

  const corpoGemini = respostaGemini.body;

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const encoder = new TextEncoder();
      const decoder = new TextDecoder();
      const reader = corpoGemini.getReader();
      const acumulado: string[] = [];
      let bufferSse = '';

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          bufferSse += decoder.decode(value, { stream: true });
          const blocos = bufferSse.split('\n\n');
          bufferSse = blocos.pop() ?? '';

          for (const bloco of blocos) {
            const linhaDado = bloco.split('\n').find((linha) => linha.startsWith('data:'));
            if (!linhaDado) continue;

            const bruto = linhaDado.slice('data:'.length).trim();
            if (!bruto || bruto === '[DONE]') continue;

            let evento: unknown;
            try {
              evento = JSON.parse(bruto);
            } catch {
              continue; // fragmento incompleto/keep-alive; ignora
            }

            const delta = extrairTexto(evento);
            if (delta) {
              acumulado.push(delta);
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ delta })}\n\n`));
            }
          }
        }

        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        controller.close();
        resolverTexto(acumulado.join(''));
      } catch (causa) {
        controller.error(causa);
        rejeitarTexto(causa);
      }
    },
  });

  return { stream, textoCompleto };
}
