import { View } from 'react-native';
import { Texto } from './Texto';
import { Regua } from './Regua';
import { cores, espaco, layout, regua } from '@/theme';

interface Props {
  kicker: string;
  /** Frase-síntese vinda da Claude API (máx. ~90 caracteres). */
  sintese: string;
  /** Parágrafo curto de apoio. */
  apoio?: string;
  /** Estado de carregamento enquanto a interpretação não chega. */
  carregando?: boolean;
}

/**
 * Bloco pôster full-bleed em accent.
 * **Um por tela, no máximo** — o vermelho é usado com parcimônia.
 * Na home é o cartão de triangulação do dia.
 */
export function BlocoPoster({ kicker, sintese, apoio, carregando }: Props) {
  return (
    <View
      style={{
        backgroundColor: cores.accent,
        paddingVertical: espaco.xl,
        paddingHorizontal: layout.padding,
      }}
    >
      <Texto variante="kicker" cor={cores.sobreAccent}>
        {kicker}
      </Texto>
      <Regua
        cor={cores.ruleSobreAccent}
        style={{ marginTop: espaco.md, marginBottom: espaco.lg, height: regua.forte }}
      />
      <Texto variante="tituloPoster">
        {carregando ? 'Lendo o dia…' : sintese}
      </Texto>
      {apoio && !carregando ? (
        <Texto variante="corpoPoster" style={{ marginTop: espaco.md }}>
          {apoio}
        </Texto>
      ) : null}
    </View>
  );
}
