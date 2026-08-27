import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Botao, CabecalhoPasso, Campo, Tela, Texto } from '@/components';
import { useRascunho } from '@/state/RascunhoOnboarding';
import { cores, espaco, layout, raio, regua } from '@/theme';

const HORA_VALIDA = /^([01]\d|2[0-3]):[0-5]\d$/;

/** Passo 2 — "Que horas eram?": hora + checkbox "Não sei a hora exata". */
export default function Passo2() {
  const router = useRouter();
  const { rascunho, atualizar } = useRascunho();

  const [hora, setHora] = useState(rascunho.hora_nascimento);
  const [semHora, setSemHora] = useState(rascunho.hora_desconhecida);
  const [erroHora, setErroHora] = useState<string>();

  function avancar() {
    if (!semHora && !HORA_VALIDA.test(hora.trim())) {
      setErroHora('Use o formato HH:MM, em 24 horas.');
      return;
    }
    setErroHora(undefined);
    atualizar({
      // Sem hora exata, o serviço assume meio-dia e devolve hora_confiavel: false.
      hora_nascimento: semHora ? '12:00' : hora.trim(),
      hora_desconhecida: semHora,
    });
    router.push('/(onboarding)/passo-3');
  }

  return (
    <Tela>
      <CabecalhoPasso passo={2} total={4} />

      <Texto variante="tituloOnboarding">Que horas eram?</Texto>
      <Texto variante="corpoSecundario" style={{ marginTop: espaco.md, marginBottom: espaco.xl }}>
        A hora define o ascendente e as casas. Sem ela, o resto do mapa continua
        valendo — a gente só avisa o que fica aproximado.
      </Texto>

      <Campo
        rotulo="Hora de nascimento"
        value={hora}
        onChangeText={setHora}
        erro={erroHora}
        editable={!semHora}
        keyboardType="number-pad"
        maxLength={5}
        placeholder="HH:MM"
        style={semHora ? { opacity: 0.4 } : undefined}
      />

      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked: semHora }}
        accessibilityLabel="Não sei a hora exata"
        onPress={() => setSemHora((v) => !v)}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: espaco.md,
          minHeight: layout.alvoMinimo,
        }}
      >
        <View
          style={{
            width: 22,
            height: 22,
            borderWidth: regua.forte,
            borderColor: cores.text,
            borderRadius: raio,
            backgroundColor: semHora ? cores.accent : 'transparent',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {semHora ? (
            <Texto variante="kicker" cor={cores.sobreAccent}>
              ✕
            </Texto>
          ) : null}
        </View>
        <Texto variante="corpoMenor">Não sei a hora exata</Texto>
      </Pressable>

      <View style={{ flexDirection: 'row', gap: espaco.md, marginTop: espaco.xl }}>
        <Botao rotulo="Voltar" variante="outline" onPress={() => router.back()} />
        <Botao rotulo="Continuar" onPress={avancar} expandir />
      </View>
    </Tela>
  );
}
