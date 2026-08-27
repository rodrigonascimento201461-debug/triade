/**
 * Tabelas de correspondência locais.
 *
 * O astro-calc-service devolve o NOME do signo; elemento, regente e modalidade
 * ele não devolve — e não deve (CLAUDE.md, PARTE 2, seção 1). Estas tabelas
 * existem só para traduzir o nome recebido em rótulos de tela.
 *
 * IMPORTANTE — isto NÃO viola a regra P0 ("nenhum nome de signo como literal no
 * código de UI"): aqui os nomes são CHAVES de consulta, em `src/data/`, nunca
 * texto renderizado direto. O que aparece na tela vem sempre da resposta da API.
 * Se nenhuma tela lê `SIGNOS` sem antes ter um `signo` vindo do backend, a regra
 * está sendo respeitada.
 *
 * VERIFICAR ao integrar: as chaves precisam bater com a grafia exata que o
 * serviço Python devolve. A busca é tolerante a acento e caixa (ver `dadosDoSigno`),
 * então "Gemeos" ou "Escorpiao" também resolvem — mas confirme mesmo assim.
 */

export type Elemento = 'Fogo' | 'Terra' | 'Ar' | 'Água';
export type Modalidade = 'Cardinal' | 'Fixo' | 'Mutável';

export interface DadosSigno {
  /** Índice 0-11 na ordem do zodíaco. grau_absoluto = indice * 30 + grau. */
  indice: number;
  elemento: Elemento;
  /** Regência moderna. Se De Lobo preferir a tradicional, trocar aqui. */
  regente: string;
  modalidade: Modalidade;
}

export const SIGNOS: Record<string, DadosSigno> = {
  'Áries': { indice: 0, elemento: 'Fogo', regente: 'Marte', modalidade: 'Cardinal' },
  'Touro': { indice: 1, elemento: 'Terra', regente: 'Vênus', modalidade: 'Fixo' },
  'Gêmeos': { indice: 2, elemento: 'Ar', regente: 'Mercúrio', modalidade: 'Mutável' },
  'Câncer': { indice: 3, elemento: 'Água', regente: 'Lua', modalidade: 'Cardinal' },
  'Leão': { indice: 4, elemento: 'Fogo', regente: 'Sol', modalidade: 'Fixo' },
  'Virgem': { indice: 5, elemento: 'Terra', regente: 'Mercúrio', modalidade: 'Mutável' },
  'Libra': { indice: 6, elemento: 'Ar', regente: 'Vênus', modalidade: 'Cardinal' },
  'Escorpião': { indice: 7, elemento: 'Água', regente: 'Plutão', modalidade: 'Fixo' },
  'Sagitário': { indice: 8, elemento: 'Fogo', regente: 'Júpiter', modalidade: 'Mutável' },
  'Capricórnio': { indice: 9, elemento: 'Terra', regente: 'Saturno', modalidade: 'Cardinal' },
  'Aquário': { indice: 10, elemento: 'Ar', regente: 'Urano', modalidade: 'Fixo' },
  'Peixes': { indice: 11, elemento: 'Água', regente: 'Netuno', modalidade: 'Mutável' },
};

/**
 * Marcas combinantes U+0300–U+036F, o bloco que sobra depois do normalize('NFD').
 * Construído a partir de string ASCII de propósito: um literal de regex com os
 * caracteres crus sobrevive mal a mudanças de encoding do arquivo.
 */
const MARCAS_DE_ACENTO = new RegExp('[\\u0300-\\u036f]', 'g');

function normalizar(valor: string): string {
  return valor.normalize('NFD').replace(MARCAS_DE_ACENTO, '').trim().toLowerCase();
}

const INDICE_NORMALIZADO = new Map(
  Object.entries(SIGNOS).map(([nome, dados]) => [normalizar(nome), dados] as const),
);

/**
 * Consulta tolerante a acento/caixa. Devolve `null` quando não reconhece —
 * a tela deve degradar (esconder o grid), nunca exibir um valor inventado.
 */
export function dadosDoSigno(nomeVindoDaApi: string | undefined): DadosSigno | null {
  if (!nomeVindoDaApi) return null;
  return INDICE_NORMALIZADO.get(normalizar(nomeVindoDaApi)) ?? null;
}

/**
 * Grau na eclíptica (0-360) a partir do signo + grau dentro do signo.
 * Usado para posicionar Sol, Lua e Ascendente na roda em SVG.
 * O serviço já devolve `grau_absoluto` para os planetas; este fallback serve
 * para ascendente/meio-céu, que podem vir sem ele.
 */
export function grauAbsoluto(
  signo: string | undefined,
  grau: number | undefined,
): number | null {
  const dados = dadosDoSigno(signo);
  if (!dados || typeof grau !== 'number') return null;
  return dados.indice * 30 + grau;
}
