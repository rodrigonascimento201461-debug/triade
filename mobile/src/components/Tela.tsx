import type { ReactNode } from 'react';
import { ScrollView, View, type ViewStyle } from 'react-native';
import { cores, espaco, layout } from '@/theme';

interface Props {
  children: ReactNode;
  /** Sem scroll (tela de cálculo, Conversa). */
  fixa?: boolean;
  /** Fundo cheio de accent (tela de cálculo). */
  fundo?: string;
  /** Bloco pôster é full-bleed: nesses casos o padding vai por dentro. */
  semPaddingHorizontal?: boolean;
  style?: ViewStyle;
}

/**
 * Container de tela. Device de referência 402x874.
 * A status bar é overlay, por isso o conteúdo começa em paddingTop 70.
 */
export function Tela({ children, fixa, fundo, semPaddingHorizontal, style }: Props) {
  const base: ViewStyle = {
    flex: 1,
    backgroundColor: fundo ?? cores.bg,
  };
  const conteudo: ViewStyle = {
    paddingTop: layout.paddingTop,
    paddingHorizontal: semPaddingHorizontal ? 0 : layout.padding,
    paddingBottom: espaco.xxl,
  };

  if (fixa) {
    return <View style={[base, conteudo, style]}>{children}</View>;
  }

  return (
    <ScrollView
      style={base}
      contentContainerStyle={[conteudo, style]}
      keyboardShouldPersistTaps="handled"
    >
      {children}
    </ScrollView>
  );
}
