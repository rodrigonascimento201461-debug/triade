import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Botao, CabecalhoPasso, Campo, Tela, Texto } from '@/components';
import { useRascunho } from '@/state/RascunhoOnboarding';
import { brParaIso, isoParaBr } from '@/utils/data';
import { cores, espaco, layout } from '@/theme';

/** Passo 1 — "Quem está chegando?": nome + data de nascimento. */
export default function Passo1() {
  const router = useRouter();
  const { rascunho, atualizar } = useRascunho();

  const [nome, setNome] = useState(rascunho.nome);
  const [data, setData] = useState(
    rascunho.data_nascimento ? isoParaBr(rascunho.data_nascimento) : '',
  );
  const [erroNome, setErroNome] = useState<string>();
  const [erroData, setErroData] = useState<string>();

  function avancar() {
    const iso = brParaIso(data);
    const nomeOk = nome.trim().length > 0;
    // P0 item 5: data válida E no passado.
    const dataOk = iso !== null && new Date(`${iso}T00:00:00Z`).getTime() < Date.now();

    setErroNome(nomeOk ? undefined : 'Como podemos te chamar?');
    setErroData(
      dataOk
        ? undefined
        : iso === null
          ? 'Use o formato DD/MM/AAAA.'
          : 'A data precisa estar no passado.',
    );
    if (!nomeOk || !dataOk || !iso) return;

    atualizar({ nome: nome.trim(), data_nascimento: iso });
    router.push('/(onboarding)/passo-2');
  }

  return (
    <Tela>
      <CabecalhoPasso passo={1} total={4} />

      <Texto variante="tituloOnboarding">Quem está chegando?</Texto>
      <Texto variante="corpoSecundario" style={{ marginTop: espaco.md, marginBottom: espaco.xl }}>
        Com o nome e a data já dá para ler duas das três tradições.
      </Texto>

      <Campo
        rotulo="Nome"
        value={nome}
        onChangeText={setNome}
        erro={erroNome}
        autoCapitalize="words"
        placeholder="Como você quer ser chamado"
      />
      <Campo
        rotulo="Data de nascimento"
        value={data}
        onChangeText={setData}
        erro={erroData}
        keyboardType="number-pad"
        maxLength={10}
        placeholder="DD/MM/AAAA"
      />

      <View style={{ flexDirection: 'row', gap: espaco.md, marginTop: espaco.xl }}>
        {/* Passo 1 não tem "Voltar". */}
        <Botao rotulo="Continuar" onPress={avancar} expandir />
      </View>

      {/* Discreto: quem já tem conta pula o onboarding inteiro. */}
      <Pressable
        accessibilityRole="link"
        onPress={() => router.push('/entrar')}
        style={{
          marginTop: espaco.xl,
          alignSelf: 'center',
          minHeight: layout.alvoMinimo,
          justifyContent: 'center',
        }}
      >
        <Texto variante="corpoSecundario" cor={cores.neutral700}>
          Já tem conta? <Texto variante="corpoSecundario" cor={cores.accent700}>Entrar</Texto>
        </Texto>
      </Pressable>
    </Tela>
  );
}
