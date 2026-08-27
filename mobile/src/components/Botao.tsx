import { useState } from 'react';
import { Pressable, View, type ViewStyle } from 'react-native';
import { Texto } from './Texto';
import { cores, espaco, layout, raio, regua } from '@/theme';

type Variante = 'primario' | 'preto' | 'outline';

interface Props {
  rotulo: string;
  onPress?: () => void;
  variante?: Variante;
  /** Seta `→` à direita, como o "Conversar sobre hoje" da home. */
  seta?: boolean;
  /** Ocupa o resto da largura no rodapé do onboarding. */
  expandir?: boolean;
  desabilitado?: boolean;
  style?: ViewStyle;
}

/**
 * Botão do DS Modernist:
 * - rótulo SEMPRE alinhado à esquerda, inclusive em botão largo (não centralizar);
 * - zero border-radius;
 * - outline inverte no pressed; vermelho vai para accent-600.
 */
export function Botao({
  rotulo,
  onPress,
  variante = 'primario',
  seta = false,
  expandir = false,
  desabilitado = false,
  style,
}: Props) {
  const [pressionado, setPressionado] = useState(false);

  const fundo = (() => {
    if (variante === 'primario') return pressionado ? cores.accent600 : cores.accent;
    if (variante === 'preto') return pressionado ? cores.accent : cores.text;
    return pressionado ? cores.text : 'transparent';
  })();

  const corTexto =
    variante === 'outline' && !pressionado ? cores.text : cores.sobreAccent;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={rotulo}
      accessibilityState={{ disabled: desabilitado }}
      disabled={desabilitado}
      onPress={onPress}
      onPressIn={() => setPressionado(true)}
      onPressOut={() => setPressionado(false)}
      style={[
        {
          backgroundColor: fundo,
          borderRadius: raio,
          borderWidth: variante === 'outline' ? regua.forte : 0,
          borderColor: cores.text,
          paddingVertical: 18,
          paddingHorizontal: espaco.lg,
          minHeight: layout.alvoMinimo,
          flexGrow: expandir ? 1 : 0,
          flexDirection: 'row',
          alignItems: 'center',
          // Rótulo à esquerda; a seta é empurrada para a direita.
          justifyContent: 'space-between',
          opacity: desabilitado ? 0.4 : 1,
        },
        style,
      ]}
    >
      <Texto variante="botao" cor={corTexto}>
        {rotulo}
      </Texto>
      {seta ? (
        <Texto variante="botao" cor={corTexto}>
          →
        </Texto>
      ) : (
        <View />
      )}
    </Pressable>
  );
}
