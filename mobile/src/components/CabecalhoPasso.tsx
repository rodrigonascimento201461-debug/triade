import { View, type DimensionValue } from 'react-native';
import { Texto } from './Texto';
import { cores, espaco, regua } from '@/theme';

interface Props {
  /** 1, 2 ou 3. */
  passo: number;
  total?: number;
}

/**
 * Cabeçalho comum dos 3 passos do onboarding:
 * marca à esquerda, contador vermelho à direita, e uma régua de 2px preta com
 * barra vermelha por cima cobrindo (passo/total) da largura.
 */
export function CabecalhoPasso({ passo, total = 3 }: Props) {
  const preenchida: DimensionValue = `${Math.min(100, (passo / total) * 100)}%`;

  return (
    <View style={{ marginBottom: espaco.xxl }}>
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          marginBottom: espaco.md,
        }}
      >
        <Texto variante="marca">TRÍADE</Texto>
        <Texto variante="kicker" cor={cores.accent}>
          {String(passo).padStart(2, '0')} / {String(total).padStart(2, '0')}
        </Texto>
      </View>

      <View style={{ height: regua.forte, backgroundColor: cores.text }}>
        <View
          style={{ height: regua.forte, width: preenchida, backgroundColor: cores.accent }}
        />
      </View>
    </View>
  );
}
