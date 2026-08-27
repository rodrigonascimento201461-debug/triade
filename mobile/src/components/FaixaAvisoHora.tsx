import { View } from 'react-native';
import { Texto } from './Texto';
import { cores, espaco, layout, raio, regua } from '@/theme';

interface Props {
  /** Renderiza só quando `hora_confiavel === false`. */
  visivel: boolean;
  texto?: string;
}

/**
 * Faixa de aviso de hora desconhecida.
 * Requisito, não enfeite: junto das tags APROXIMADO do Mapa, é o que impede o
 * app de esconder a incerteza (CLAUDE.md, "Não fazer").
 *
 * Full-bleed: bordas superior e inferior de 2px accent, fundo accent-100.
 */
export function FaixaAvisoHora({ visivel, texto }: Props) {
  if (!visivel) return null;

  return (
    <View
      accessibilityRole="alert"
      style={{
        backgroundColor: cores.accent100,
        borderTopWidth: regua.forte,
        borderBottomWidth: regua.forte,
        borderColor: cores.accent,
        paddingVertical: espaco.md,
        paddingHorizontal: layout.padding,
        flexDirection: 'row',
        alignItems: 'center',
        gap: espaco.md,
      }}
    >
      <View
        style={{
          width: 20,
          height: 20,
          borderWidth: regua.forte,
          borderColor: cores.accent,
          borderRadius: raio,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Texto variante="kicker" cor={cores.accent}>
          !
        </Texto>
      </View>
      <Texto variante="corpoAviso" style={{ flex: 1 }}>
        {texto ??
          'Sem a hora exata, o ascendente e as casas ficam aproximados. O resto do mapa continua válido.'}
      </Texto>
    </View>
  );
}
