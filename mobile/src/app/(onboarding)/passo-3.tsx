import { useState } from 'react';
import { View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Botao, CabecalhoPasso, Campo, Tela, Texto } from '@/components';
import { useRascunho } from '@/state/RascunhoOnboarding';
import { espaco } from '@/theme';

/**
 * Passo 3 — "Onde foi?": cidade + país. Segue para o passo 4 (conta).
 *
 * Nota: o backend hoje NÃO propaga erro de geocoding do cadastro — se a
 * cidade não for encontrada, a conta ainda é criada com `mapa: null` (ver
 * `calculando.tsx` e `PerfilContext.tentarRecalcularMapa`). Este passo só
 * valida "cidade obrigatória"; a mensagem de "cidade não encontrada" real
 * aparece depois, no retry.
 */
export default function Passo3() {
  const router = useRouter();
  const { rascunho, atualizar } = useRascunho();
  const { erro } = useLocalSearchParams<{ erro?: string }>();

  const [cidade, setCidade] = useState(rascunho.cidade);
  const [pais, setPais] = useState(rascunho.pais || 'Brasil');
  const [erroCidade, setErroCidade] = useState<string | undefined>(erro);

  function avancar() {
    if (!cidade.trim()) {
      setErroCidade('Informe a cidade onde você nasceu.');
      return;
    }
    setErroCidade(undefined);
    atualizar({ cidade: cidade.trim(), pais: pais.trim() || 'Brasil' });
    router.push('/(onboarding)/passo-4');
  }

  return (
    <Tela>
      <CabecalhoPasso passo={3} total={4} />

      <Texto variante="tituloOnboarding">Onde foi?</Texto>
      <Texto variante="corpoSecundario" style={{ marginTop: espaco.md, marginBottom: espaco.xl }}>
        O local define o fuso e o céu visto de lá naquele momento.
      </Texto>

      <Campo
        rotulo="Cidade"
        value={cidade}
        onChangeText={setCidade}
        erro={erroCidade}
        autoCapitalize="words"
        placeholder="Nome completo da cidade"
      />
      <Campo
        rotulo="País"
        value={pais}
        onChangeText={setPais}
        autoCapitalize="words"
        placeholder="País"
      />

      <View style={{ flexDirection: 'row', gap: espaco.md, marginTop: espaco.xl }}>
        <Botao rotulo="Voltar" variante="outline" onPress={() => router.back()} />
        <Botao rotulo="Continuar" onPress={avancar} expandir />
      </View>
    </Tela>
  );
}
