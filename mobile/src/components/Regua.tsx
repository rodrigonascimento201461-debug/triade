import { View, type ViewStyle } from 'react-native';
import { cores, regua } from '@/theme';

interface Props {
  /** 'forte' = 2px preta (padrão). 'leve' = 1px, só entre linhas de lista. */
  peso?: 'forte' | 'leve';
  cor?: string;
  style?: ViewStyle;
}

/**
 * Divisória. Réguas de 2px, não hairlines — elas é que organizam a tela.
 * Nunca use `borderBottomWidth: StyleSheet.hairlineWidth` neste projeto.
 */
export function Regua({ peso = 'forte', cor, style }: Props) {
  return (
    <View
      style={[
        {
          height: peso === 'forte' ? regua.forte : regua.leve,
          backgroundColor: cor ?? (peso === 'forte' ? cores.text : cores.divider),
          width: '100%',
        },
        style,
      ]}
    />
  );
}
