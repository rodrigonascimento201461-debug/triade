import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

/**
 * Rascunho do onboarding: o que já foi digitado enquanto os 3 passos não
 * terminam. Só vira `Perfil` de verdade na tela de cálculo.
 *
 * Existe separado do PerfilContext de propósito: um onboarding abandonado no
 * passo 2 não deve deixar meio perfil salvo no estado global.
 */

export interface Rascunho {
  nome: string;
  /** ISO `YYYY-MM-DD` (convertido de DD/MM/AAAA na entrada). */
  data_nascimento: string;
  /** `HH:MM`. Quando `hora_desconhecida`, o serviço assume meio-dia. */
  hora_nascimento: string;
  hora_desconhecida: boolean;
  cidade: string;
  pais: string;
  /** Passo 4 — conta (e-mail/senha). Coletado por último, ver `passo-4.tsx`. */
  email: string;
  senha: string;
}

const VAZIO: Rascunho = {
  nome: '',
  data_nascimento: '',
  hora_nascimento: '',
  hora_desconhecida: false,
  cidade: '',
  pais: '',
  email: '',
  senha: '',
};

interface Contexto {
  rascunho: Rascunho;
  atualizar: (campos: Partial<Rascunho>) => void;
  zerar: () => void;
}

const Ctx = createContext<Contexto | null>(null);

export function RascunhoProvider({ children }: { children: ReactNode }) {
  const [rascunho, setRascunho] = useState<Rascunho>(VAZIO);

  const valor = useMemo<Contexto>(
    () => ({
      rascunho,
      atualizar: (campos) => setRascunho((atual) => ({ ...atual, ...campos })),
      zerar: () => setRascunho(VAZIO),
    }),
    [rascunho],
  );

  return <Ctx.Provider value={valor}>{children}</Ctx.Provider>;
}

export function useRascunho(): Contexto {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useRascunho precisa estar dentro de <RascunhoProvider>.');
  return ctx;
}
