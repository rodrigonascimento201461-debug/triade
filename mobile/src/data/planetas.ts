import type { ChavePlaneta } from '@shared/types/astro';

/**
 * Chave técnica devolvida pelo serviço → rótulo em pt-BR e glifo.
 *
 * ATENÇÃO (briefing, seção Assets): estes glifos são caracteres Unicode e a
 * renderização varia entre Android e iOS. Antes do lançamento, avaliar trocar
 * por SVGs próprios ou uma fonte de glifos astrológicos, para consistência.
 */
export const PLANETAS: Record<ChavePlaneta, { rotulo: string; glifo: string }> = {
  sol: { rotulo: 'Sol', glifo: '☉' },
  lua: { rotulo: 'Lua', glifo: '☽' },
  mercurio: { rotulo: 'Mercúrio', glifo: '☿' },
  venus: { rotulo: 'Vênus', glifo: '♀' },
  marte: { rotulo: 'Marte', glifo: '♂' },
  jupiter: { rotulo: 'Júpiter', glifo: '♃' },
  saturno: { rotulo: 'Saturno', glifo: '♄' },
  urano: { rotulo: 'Urano', glifo: '♅' },
  netuno: { rotulo: 'Netuno', glifo: '♆' },
  plutao: { rotulo: 'Plutão', glifo: '♇' },
};

/** Pontos que não são planetas mas aparecem na lista "O que está onde". */
export const PONTOS = {
  ascendente: { rotulo: 'Ascendente', glifo: 'Asc' },
  meio_ceu: { rotulo: 'Meio-céu', glifo: 'MC' },
} as const;

/**
 * Itens cuja precisão depende da hora de nascimento. Quando
 * `hora_confiavel === false`, estes recebem a tag APROXIMADO no Mapa.
 */
export function dependeDaHora(idDoItem: string): boolean {
  return idDoItem === 'ascendente' || idDoItem === 'meio_ceu' || idDoItem.startsWith('casa_');
}

/**
 * TODO: tema de cada casa em linguagem simples (casa → frase curta).
 * Ainda não escrito — é copy de produto, não decisão de arquitetura.
 * Cabe ao especialista de conteúdo/UX, com o tom definido no briefing.
 */
export const TEMAS_DAS_CASAS: Record<number, string> = {};

/**
 * Glifo vermelho de cada sistema (não do signo!) usado na coluna fixa de 44px
 * das três linhas da Home. Igual aos glifos de planeta: caracteres Unicode,
 * não nomes de signo — não viola a regra P0.
 */
export const GLIFO_SISTEMA: Record<import('@shared/types/astro').SistemaId, string> = {
  ocidental: PLANETAS.sol.glifo,
  chines: '⊕',
  egipcio: '☥',
};
