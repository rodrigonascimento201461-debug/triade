/**
 * Contrato de dados do astro-calc-service (FastAPI).
 * Espelha a PARTE 2 do CLAUDE.md. Alterou o serviço? Altere aqui primeiro.
 *
 * SOMENTE TIPOS. Ver shared/README.md.
 *
 * Nota deliberada: nenhum nome de signo/animal/divindade aparece como union
 * literal aqui. Eles são `string` porque quem manda é o serviço — travar em
 * union de literais recriaria o bug do protótipo (signos fixos no cliente).
 */

// ---------------------------------------------------------------------------
// Entrada
// ---------------------------------------------------------------------------

/** O que o onboarding coleta. É a fonte da verdade de tudo no app. */
export interface DadosNascimento {
  /** ISO `YYYY-MM-DD` */
  data_nascimento: string;
  /** `HH:MM` 24h. Quando `hora_desconhecida`, o serviço assume meio-dia. */
  hora_nascimento: string;
  hora_desconhecida: boolean;
  cidade: string;
  pais: string;
}

/** Só data — usado pelo chinês e pelo egípcio. */
export interface DataNascimentoInput {
  /** ISO `YYYY-MM-DD` */
  data_nascimento: string;
}

/**
 * Envelope exigido pelo endpoint /calcular/mapa-ocidental do serviço Python.
 * Os outros dois endpoints recebem o objeto plano, sem envelope.
 * O app NÃO usa este tipo: ele manda `DadosNascimento` plano para o backend,
 * e o backend embrulha. Ver backend/src/lib/astroCalc.ts.
 */
export interface EnvelopeMapaOcidental {
  dados: DadosNascimento;
}

// ---------------------------------------------------------------------------
// 1. POST /calcular/mapa-ocidental
// ---------------------------------------------------------------------------

export interface PosicaoPlanetaria {
  /** Nome do signo em pt-BR, como o serviço devolve. */
  signo: string;
  /** Grau dentro do signo, 0-30. */
  grau: number;
  /** Grau na eclíptica, 0-360. Usado para desenhar a roda. */
  grau_absoluto?: number;
  retrogrado?: boolean;
  casa?: number;
}

export interface Cuspide {
  signo: string;
  grau: number;
  casa: number;
}

export type ChavePlaneta =
  | 'sol'
  | 'lua'
  | 'mercurio'
  | 'venus'
  | 'marte'
  | 'jupiter'
  | 'saturno'
  | 'urano'
  | 'netuno'
  | 'plutao';

export interface Aspecto {
  planeta_1: string;
  planeta_2: string;
  /** ex.: 'conjuncao' | 'trigono' | 'quadratura' | 'oposicao' | 'sextil' */
  tipo: string;
  diferenca_graus: number;
}

export interface LocalizacaoUsada {
  latitude: number;
  longitude: number;
  timezone_iana: string;
  cidade?: string;
  pais?: string;
  nome_completo?: string;
}

export interface MetadataMapa {
  sistema_casas: string;
  /** ISO 8601 com offset. */
  data_hora_utc_usada: string;
}

export interface MapaOcidental {
  sol: PosicaoPlanetaria;
  lua: PosicaoPlanetaria;
  ascendente: PosicaoPlanetaria;
  meio_ceu: PosicaoPlanetaria;
  planetas: Partial<Record<ChavePlaneta, PosicaoPlanetaria>>;
  /** 12 itens. */
  casas: Cuspide[];
  aspectos: Aspecto[];
  metadata: MetadataMapa;
  localizacao_usada: LocalizacaoUsada;
  /**
   * `false` quando a hora é desconhecida. Dispara a faixa de aviso na home e
   * no mapa, e as tags APROXIMADO em ascendente / meio-céu / casas.
   * Requisito do briefing: nunca esconder essa incerteza.
   */
  hora_confiavel: boolean;
}

// ---------------------------------------------------------------------------
// 2. POST /calcular/signo-chines
// ---------------------------------------------------------------------------

export interface SignoChines {
  animal: string;
  elemento: string;
  /** 'Yin' | 'Yang' */
  yin_yang: string;
  /**
   * Ano do ciclo lunissolar de fato usado. Pode ser o ano anterior ao da data
   * digitada quando a pessoa nasceu antes do Ano Novo Chinês.
   */
  ano_efetivo_calculo: number;
  metodologia: string;
  /** P1 item 7: ainda não vem do serviço. Opcional até ser adicionado lá. */
  tronco_celeste?: string;
  ramo_terrestre?: string;
}

// ---------------------------------------------------------------------------
// 3. POST /calcular/sistema-egipcio
// ---------------------------------------------------------------------------

export interface SistemaEgipcio {
  divindade: string;
  /** ex.: '09/05 a 02/06' */
  periodo: string;
  /** Texto de ressalva obrigatório. Exibir na íntegra no Perfil. */
  metodologia: string;
}

// ---------------------------------------------------------------------------
// Agregado
// ---------------------------------------------------------------------------

/** As três leituras juntas, como o app guarda depois do onboarding. */
export interface Triade {
  ocidental: MapaOcidental;
  chines: SignoChines;
  egipcio: SistemaEgipcio;
}

/** Qual das três tradições — usado nas abas de Signos e nas linhas da home. */
export type SistemaId = 'ocidental' | 'chines' | 'egipcio';
