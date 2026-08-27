import type { TextStyle } from 'react-native';
import { cores } from './tokens';

/**
 * Uma única fonte: **Archivo**. Não trocar (CLAUDE.md, "Não fazer").
 *
 * Os nomes abaixo são exatamente as chaves exportadas por
 * `@expo-google-fonts/archivo` e as que serão registradas em `useFonts`
 * no _layout raiz. Em React Native não existe `fontWeight` de verdade em
 * fonte custom: o peso vem do arquivo, por isso cada peso é uma família.
 */
export const fonte = {
  regular: 'Archivo_400Regular',
  medium: 'Archivo_500Medium',
  semibold: 'Archivo_600SemiBold',
  bold: 'Archivo_700Bold',
  extrabold: 'Archivo_800ExtraBold',
  black: 'Archivo_900Black',
} as const;

export type PesoFonte = keyof typeof fonte;

/**
 * Escala tipográfica das telas.
 * `lineHeight` em px = múltiplo do CLAUDE.md aplicado ao fontSize.
 * `letterSpacing` em px = em × fontSize (RN não aceita `em`).
 */
export const texto = {
  /** Archivo 900, 40/0.95, -0.02em — título de tela */
  tituloTela: {
    fontFamily: fonte.black,
    fontSize: 40,
    lineHeight: 38,
    letterSpacing: -0.8,
    color: cores.text,
  },
  /** Archivo 900, 38/0.98 — título de onboarding */
  tituloOnboarding: {
    fontFamily: fonte.black,
    fontSize: 38,
    lineHeight: 37,
    letterSpacing: -0.76,
    color: cores.text,
  },
  /** Archivo 900, 46/0.95 — nome do signo na aba */
  nomeSigno: {
    fontFamily: fonte.black,
    fontSize: 46,
    lineHeight: 44,
    letterSpacing: -0.92,
    color: cores.text,
  },
  /** Archivo 900, 34 — frase da tela de cálculo (sobre fundo accent) */
  tituloCalculando: {
    fontFamily: fonte.black,
    fontSize: 34,
    lineHeight: 36,
    letterSpacing: -0.68,
    color: cores.sobreAccent,
  },
  /** Archivo 900, 26 — cabeçalho da Conversa / porcentagem de sinastria */
  tituloCompacto: {
    fontFamily: fonte.black,
    fontSize: 26,
    lineHeight: 28,
    letterSpacing: -0.52,
    color: cores.text,
  },
  /** Archivo 800, 27/1.1 — título do bloco pôster */
  tituloPoster: {
    fontFamily: fonte.extrabold,
    fontSize: 27,
    lineHeight: 30,
    letterSpacing: -0.4,
    color: cores.sobreAccent,
  },
  /** Archivo 800, 20/1.15 — título de linha/card (nome do signo na home) */
  tituloLinha: {
    fontFamily: fonte.extrabold,
    fontSize: 20,
    lineHeight: 23,
    color: cores.text,
  },
  /** Archivo 800, 17/1.15 — título de card menor */
  tituloCard: {
    fontFamily: fonte.extrabold,
    fontSize: 17,
    lineHeight: 20,
    color: cores.text,
  },
  /** Archivo 800, 16 — item da lista "O que está onde" */
  tituloItem: {
    fontFamily: fonte.extrabold,
    fontSize: 16,
    lineHeight: 19,
    color: cores.text,
  },
  /** Archivo 400, 16/1.5 — corpo */
  corpo: {
    fontFamily: fonte.regular,
    fontSize: 16,
    lineHeight: 24,
    color: cores.text,
  },
  /** Archivo 400, 15/1.5 — corpo menor */
  corpoMenor: {
    fontFamily: fonte.regular,
    fontSize: 15,
    lineHeight: 22.5,
    color: cores.text,
  },
  /** Archivo 400, 14/1.45, neutral-700 — corpo secundário */
  corpoSecundario: {
    fontFamily: fonte.regular,
    fontSize: 14,
    lineHeight: 20,
    color: cores.neutral700,
  },
  /** Archivo 400, 14.5 — parágrafo de apoio do bloco pôster */
  corpoPoster: {
    fontFamily: fonte.regular,
    fontSize: 14.5,
    lineHeight: 21,
    color: cores.sobreAccent,
  },
  /** Archivo 400, 13 — texto da faixa de aviso */
  corpoAviso: {
    fontFamily: fonte.regular,
    fontSize: 13,
    lineHeight: 19,
    color: cores.accent800,
  },
  /** Archivo 700, 10, 0.18em, UPPERCASE — kicker/rótulo */
  kicker: {
    fontFamily: fonte.bold,
    fontSize: 10,
    letterSpacing: 1.8,
    textTransform: 'uppercase',
    color: cores.neutral600,
  },
  /** Archivo 700, 9, 0.1em, UPPERCASE — rótulo da tab bar */
  rotuloTabBar: {
    fontFamily: fonte.bold,
    fontSize: 9,
    letterSpacing: 0.9,
    textTransform: 'uppercase',
  },
  /** Archivo 900, 15, 0.14em — marca TRÍADE no onboarding */
  marca: {
    fontFamily: fonte.black,
    fontSize: 15,
    letterSpacing: 2.1,
    color: cores.text,
  },
  /** Archivo 700, 16 — rótulo de botão (sempre alinhado à esquerda) */
  botao: {
    fontFamily: fonte.bold,
    fontSize: 16,
    letterSpacing: 0,
  },
  /** Archivo 500, 17 — texto digitado em campo de input */
  input: {
    fontFamily: fonte.medium,
    fontSize: 17,
    color: cores.text,
  },
} satisfies Record<string, TextStyle>;

export type EstiloTexto = keyof typeof texto;
