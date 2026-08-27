/**
 * Contrato entre o app Expo e o backend Next.js.
 * SOMENTE TIPOS. Ver shared/README.md.
 */

import type { DadosNascimento, SistemaId, Triade } from './astro';

// ---------------------------------------------------------------------------
// Erros
// ---------------------------------------------------------------------------

/**
 * Todo erro do backend sai neste formato. O app decide a tela pelo `codigo`,
 * nunca pelo texto da mensagem.
 */
export type CodigoErro =
  /** 422 do astro-calc: cidade não encontrada. Volta ao passo 3 do onboarding. */
  | 'GEOCODING_FALHOU'
  /** 422 do chinês: ano fora da tabela ANO_NOVO_CHINES. Degradar para 2 sistemas. */
  | 'ANO_FORA_DA_TABELA'
  /** Corpo da requisição inválido (falha do cliente). */
  | 'ENTRADA_INVALIDA'
  /** astro-calc fora do ar, timeout ou 500. Tela de falha com "Tentar de novo". */
  | 'SERVICO_INDISPONIVEL'
  /** Falha na API de interpretação (Gemini). O cálculo pode ser exibido sem os textos. */
  | 'INTERPRETACAO_INDISPONIVEL'
  /** Sem `Authorization: Bearer <token>` válido. Leva para a tela de login. */
  | 'NAO_AUTENTICADO'
  /** Login: e-mail ou senha incorretos. */
  | 'CREDENCIAIS_INVALIDAS'
  /** Cadastro: já existe conta com esse e-mail. */
  | 'EMAIL_JA_CADASTRADO'
  /** Leitura diária / signos / conversa exigem `mapas_natais` já calculado e persistido. */
  | 'MAPA_NAO_CALCULADO'
  /** Endpoint ainda não implementado (stubs do scaffold). */
  | 'NAO_IMPLEMENTADO'
  | 'ERRO_INTERNO';

export interface ApiErro {
  erro: {
    codigo: CodigoErro;
    /** Mensagem em pt-BR, pronta para exibir. */
    mensagem: string;
    /** Só em dev: detalhe cru do upstream. */
    detalhe?: unknown;
  };
}

// ---------------------------------------------------------------------------
// Textos interpretativos (Claude API) — CLAUDE.md, PARTE 2, seção 4
// ---------------------------------------------------------------------------

/** Bloco pôster da home + uma frase por sistema. Cache por (usuário, dia). */
export interface LeituraDiaria {
  /** ISO `YYYY-MM-DD` do dia da leitura. */
  data: string;
  /** Frase-síntese do bloco pôster, máx. ~90 caracteres. */
  sintese: string;
  /** Parágrafo curto de apoio do bloco pôster. */
  apoio: string;
  /** Uma frase do dia por sistema, para as três linhas da home. */
  frases: Record<SistemaId, string>;
}

/** Dois parágrafos por sistema, sobre a pessoa (não sobre o dia). Cache permanente. */
export type InterpretacaoSignos = Record<SistemaId, { paragrafos: string[] }>;

/** Uma frase por posição, para a lista "O que está onde" do Mapa. */
export interface InterpretacaoMapa {
  /** chave = id do item (planeta, 'ascendente', 'casa_4'...) → frase. */
  posicoes: Record<string, string>;
}

// ---------------------------------------------------------------------------
// Conversa
// ---------------------------------------------------------------------------

export type PapelMensagem = 'usuario' | 'triade';

export interface Mensagem {
  id: string;
  papel: PapelMensagem;
  texto: string;
  /** ISO 8601. */
  criada_em: string;
}

export interface ConversaRequest {
  mensagem: string;
  /**
   * Não usado pelo backend hoje: o histórico é lido de `mensagens` no
   * Supabase (fonte da verdade), não do que o app manda. Mantido no tipo
   * para não quebrar chamadas existentes; pode ser removido depois.
   */
  historico?: Mensagem[];
}

// ---------------------------------------------------------------------------
// Autenticação (Supabase Auth — e-mail/senha)
// ---------------------------------------------------------------------------

/**
 * Corpo do cadastro: credenciais + os mesmos dados que o onboarding já coleta
 * (CLAUDE.md, "Estado necessário" — `usuario`). O backend cria o usuário no
 * Supabase Auth E a linha em `perfis` numa única chamada.
 */
export interface CadastroRequest extends DadosNascimento {
  email: string;
  /** Mínimo 8 caracteres — validado no backend (zod). */
  senha: string;
  nome: string;
}

export interface LoginRequest {
  email: string;
  senha: string;
}

/** Tokens da sessão do Supabase Auth. O app guarda e manda `access_token` como `Authorization: Bearer`. */
export interface SessaoAuth {
  access_token: string;
  refresh_token: string;
  /** epoch seconds (`session.expires_at` do Supabase) em que `access_token` expira. */
  expira_em: number;
}

/** Linha de `perfis`, como o app precisa para preencher o estado local. */
export interface Perfil {
  id: string;
  nome: string;
  data_nascimento: string;
  hora_nascimento: string | null;
  hora_desconhecida: boolean;
  cidade: string;
  pais: string;
  criado_em: string;
}

/** Resposta de `POST /api/auth/cadastro` e `POST /api/auth/login`. */
export interface AuthResponse {
  sessao: SessaoAuth;
  perfil: Perfil;
  /**
   * O mapa calculado (os 3 sistemas), se já existir. No cadastro, é
   * calculado na hora a partir dos dados de nascimento informados — `null`
   * só quando o cálculo falhou (ex. cidade não encontrada); a conta ainda
   * assim é criada. No login, vem do cache em `mapas_natais`; `null` se por
   * algum motivo nunca foi calculado.
   */
  mapa: Triade | null;
}
