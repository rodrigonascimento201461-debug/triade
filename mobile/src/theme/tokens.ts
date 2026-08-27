/**
 * Tokens do design system **Modernist**.
 * Transcritos da tabela de tokens do CLAUDE.md. Fonte final: o `styles.css`
 * dentro de `design/_ds/modernist-.../`, ainda não enviado.
 *
 * Regra: NENHUM valor de cor, espaçamento ou tamanho de fonte pode ser escrito
 * solto numa tela. Se não está aqui, não existe — pergunte antes de inventar.
 */

export const cores = {
  bg: '#f3f2f2',
  surface: '#eae9e9',
  text: '#201e1d',

  accent: '#ec3013',
  /** faixa de aviso */
  accent100: '#fff2ef',
  /** estado pressed do botão vermelho */
  accent600: '#dd2b0f',
  /** texto vermelho em corpo (contraste em texto pequeno) */
  accent700: '#ae1800',
  /** texto sobre fundo accent-100 */
  accent800: '#7c1405',

  /** `--color-text` a 40% */
  divider: 'rgba(32, 30, 29, 0.4)',

  neutral500: '#9b9797',
  neutral600: '#7d7979',
  neutral700: '#605d5d',

  /**
   * PENDENTE: `--color-neutral-200` é citado nas interações (fundo de linha de
   * lista pressionada) mas não consta na tabela de tokens. Valor provisório —
   * confirmar contra o styles.css do DS quando chegar.
   */
  neutral200: '#dedcdc',

  /** Texto sobre o bloco pôster vermelho e sobre a tela de cálculo. */
  sobreAccent: '#ffffff',
  /** Régua branca a 35% dentro do bloco pôster. */
  ruleSobreAccent: 'rgba(255, 255, 255, 0.35)',
} as const;

/** Escala de espaçamento. Não use números fora dela. */
export const espaco = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

/**
 * Zero border-radius em qualquer lugar. É de propósito.
 * Existe como token só para que ninguém precise escrever `borderRadius: 0`
 * na mão — e para que um `borderRadius` diferente de 0 salte aos olhos em review.
 */
export const raio = 0 as const;

/** Réguas de 2px, não hairlines. Divisórias fortes organizam a tela. */
export const regua = {
  /** divisória padrão */
  forte: 2,
  /** separador leve entre linhas de lista (Perfil) */
  leve: 1,
  /** círculo interno da roda astrológica */
  fina: 1,
  /** sublinhado da aba ativa em Signos */
  abaAtiva: 4,
  /** barra à esquerda do bloco da IA na Conversa e das metodologias no Perfil */
  barraLateral: 3,
} as const;

export const layout = {
  /** Padding horizontal padrão das telas. */
  padding: 24,
  /** A status bar é overlay: o conteúdo começa aqui. */
  paddingTop: 70,
  /** Home indicator. */
  tabBarPaddingBottom: 30,
  /** Alvo de toque mínimo. Nunca abaixo disso. */
  alvoMinimo: 44,
  /** Coluna fixa do glifo nas três linhas da home. */
  colunaGlifoHome: 44,
  /** Coluna do glifo na lista "O que está onde" do Mapa. */
  colunaGlifoMapa: 34,
  /** Coluna da data nos próximos trânsitos. */
  colunaDataTransito: 52,
  /** Coluna da porcentagem na lista de sinastria. */
  colunaPorcentagem: 54,
  /** Largura máxima do balão do usuário na Conversa. */
  maxLarguraMensagem: '82%',
  /** Roda astrológica em SVG. */
  roda: 330,
} as const;

/**
 * Transições de 120-160ms, em cor apenas. Sem animação elaborada:
 * o sistema é flat e estático de propósito.
 */
export const duracao = {
  cor: 140,
} as const;
