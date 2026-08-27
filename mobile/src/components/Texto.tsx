import { Text as TextRN, type TextProps as TextPropsRN } from 'react-native';
import { texto, type EstiloTexto } from '@/theme';

interface Props extends TextPropsRN {
  /** Chave da escala tipográfica. Não escreva fontSize/fontFamily na mão. */
  variante?: EstiloTexto;
  /** Sobrescreve só a cor — o resto vem da escala. */
  cor?: string;
}

/**
 * Todo texto do app passa por aqui. Isso garante Archivo em todo lugar:
 * um `<Text>` cru do React Native cai na fonte do sistema e quebra o DS.
 */
export function Texto({ variante = 'corpo', cor, style, ...rest }: Props) {
  return <TextRN {...rest} style={[texto[variante], cor ? { color: cor } : null, style]} />;
}
