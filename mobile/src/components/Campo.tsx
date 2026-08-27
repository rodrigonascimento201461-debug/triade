import { TextInput, View, type TextInputProps } from 'react-native';
import { Texto } from './Texto';
import { cores, espaco, layout, raio, regua } from '@/theme';

interface Props extends TextInputProps {
  rotulo: string;
  /** Mensagem inline abaixo do campo; deixa a borda vermelha (P0 item 5). */
  erro?: string;
}

/** Campo de input: borda 2px sólida, padding 14, Archivo 500/17, zero raio. */
export function Campo({ rotulo, erro, style, ...rest }: Props) {
  return (
    <View style={{ marginBottom: espaco.lg }}>
      <Texto variante="kicker" style={{ marginBottom: espaco.sm }}>
        {rotulo}
      </Texto>
      <TextInput
        accessibilityLabel={rotulo}
        placeholderTextColor={cores.neutral500}
        style={[
          {
            borderWidth: regua.forte,
            borderColor: erro ? cores.accent : cores.text,
            borderRadius: raio,
            padding: 14,
            minHeight: layout.alvoMinimo,
            fontFamily: 'Archivo_500Medium',
            fontSize: 17,
            color: cores.text,
            backgroundColor: cores.bg,
          },
          style,
        ]}
        {...rest}
      />
      {erro ? (
        <Texto variante="corpoSecundario" cor={cores.accent700} style={{ marginTop: espaco.xs }}>
          {erro}
        </Texto>
      ) : null}
    </View>
  );
}
