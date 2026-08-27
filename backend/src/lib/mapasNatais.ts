/**
 * Persistência do mapa calculado (`mapas_natais`), por perfil.
 *
 * Gap que ficou pendente da entrega anterior: as rotas `/api/calcular/*`
 * continuam proxy puro e não sabem "de quem" é o cálculo — não dá pra
 * persistir lá (o mesmo endpoint calcula o mapa de uma segunda pessoa na
 * Sinastria, e isso NUNCA pode sobrescrever o mapa do usuário logado).
 *
 * A persistência acontece só nos dois lugares que sabem que o cálculo é do
 * próprio usuário: cadastro (calcula na hora, a partir dos dados que acabou
 * de informar) e login (lê o que já foi calculado). Ver
 * `app/api/auth/cadastro/route.ts` e `app/api/auth/login/route.ts`.
 */

import type { DadosNascimento, Triade } from '@shared/types/astro';
import {
  calcularMapaOcidental,
  calcularSignoChines,
  calcularSistemaEgipcio,
} from './astroCalc';
import { clienteAdmin } from './supabase';

interface LinhaMapaNatal {
  ocidental: Triade['ocidental'] | null;
  chines: Triade['chines'] | null;
  egipcio: Triade['egipcio'] | null;
}

/** Lê o mapa já calculado do perfil, se existir. Nunca lança — cache é opcional. */
export async function buscarMapaNatal(perfilId: string): Promise<Triade | null> {
  const supabase = clienteAdmin();
  const { data, error } = await supabase
    .from('mapas_natais')
    .select('ocidental, chines, egipcio')
    .eq('perfil_id', perfilId)
    .maybeSingle<LinhaMapaNatal>();

  if (error || !data || !data.ocidental || !data.chines || !data.egipcio) {
    return null;
  }
  return { ocidental: data.ocidental, chines: data.chines, egipcio: data.egipcio };
}

/**
 * Calcula os 3 sistemas a partir dos dados de nascimento e persiste em
 * `mapas_natais`. Usado só no cadastro, com os dados que o usuário acabou de
 * informar — nunca lança: se o cálculo falhar (ex. geocoding), devolve
 * `null` e a conta ainda é criada. O app descobre que falta calcular pelo
 * 409 `MAPA_NAO_CALCULADO` das rotas de interpretação, e pode reenviar os
 * dados de nascimento pra tentar de novo mais tarde (fora do escopo desta
 * entrega — ver README.md).
 */
export async function calcularEPersistirMapaNatal(
  perfilId: string,
  dados: DadosNascimento,
): Promise<Triade | null> {
  const [ocidental, chines, egipcio] = await Promise.allSettled([
    calcularMapaOcidental(dados),
    calcularSignoChines({ data_nascimento: dados.data_nascimento }),
    calcularSistemaEgipcio({ data_nascimento: dados.data_nascimento }),
  ]);

  if (ocidental.status === 'rejected' || chines.status === 'rejected' || egipcio.status === 'rejected') {
    const falhas = [ocidental, chines, egipcio]
      .filter((r): r is PromiseRejectedResult => r.status === 'rejected')
      .map((r) => String(r.reason));
    console.error('[mapasNatais] cálculo falhou no cadastro, perfil sem mapa por enquanto:', falhas);
    return null;
  }

  const triade: Triade = {
    ocidental: ocidental.value,
    chines: chines.value,
    egipcio: egipcio.value,
  };

  const supabase = clienteAdmin();
  const { error } = await supabase
    .from('mapas_natais')
    .upsert(
      { perfil_id: perfilId, ...triade, atualizado_em: new Date().toISOString() },
      { onConflict: 'perfil_id' },
    );

  if (error) {
    // O cálculo funcionou mas não persistiu — devolve pro app mesmo assim
    // (melhor exibir uma vez do que nada), mas fica sem cache.
    console.error('[mapasNatais] cálculo ok mas upsert falhou:', error.message);
  }

  return triade;
}
