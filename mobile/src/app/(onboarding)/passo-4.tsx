import { useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { Botao, CabecalhoPasso, Campo, Tela, Texto } from '@/components';
import { useRascunho } from '@/state/RascunhoOnboarding';
import { espaco } from '@/theme';

const EMAIL_VALIDO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Passo 4 — "Sua conta": e-mail + senha. Último passo antes de "Montar meu
 * mapa" (decisão de produto — ver README/resumo da tarefa: colocado por
 * último, não junto do passo 1, para aproveitar o esforço já investido nos
 * 3 passos anteriores em vez de pedir conta antes de qualquer valor visível).
 *
 * Ao confirmar, vai para `calculando.tsx`, que chama `POST /api/auth/cadastro`
 * numa chamada só (cria a conta E calcula o mapa).
 */
export default function Passo4() {
  const router = useRouter();
  const { rascunho, atualizar } = useRascunho();

  const [email, setEmail] = useState(rascunho.email);
  const [senha, setSenha] = useState(rascunho.senha);
  const [erroEmail, setErroEmail] = useState<string>();
  const [erroSenha, setErroSenha] = useState<string>();

  function avancar() {
    const emailOk = EMAIL_VALIDO.test(email.trim());
    const senhaOk = senha.length >= 8;

    setErroEmail(emailOk ? undefined : 'Informe um e-mail válido.');
    setErroSenha(senhaOk ? undefined : 'A senha precisa ter pelo menos 8 caracteres.');
    if (!emailOk || !senhaOk) return;

    atualizar({ email: email.trim().toLowerCase(), senha });
    router.push('/(onboarding)/calculando');
  }

  return (
    <Tela>
      <CabecalhoPasso passo={4} total={4} />

      <Texto variante="tituloOnboarding">Pra guardar seu mapa</Texto>
      <Texto variante="corpoSecundario" style={{ marginTop: espaco.md, marginBottom: espaco.xl }}>
        Crie uma conta com e-mail e senha — assim você não perde sua leitura e
        pode voltar quando quiser.
      </Texto>

      <Campo
        rotulo="E-mail"
        value={email}
        onChangeText={setEmail}
        erro={erroEmail}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="email-address"
        placeholder="voce@exemplo.com"
      />
      <Campo
        rotulo="Senha"
        value={senha}
        onChangeText={setSenha}
        erro={erroSenha}
        autoCapitalize="none"
        autoCorrect={false}
        secureTextEntry
        placeholder="Mínimo 8 caracteres"
      />

      <View style={{ flexDirection: 'row', gap: espaco.md, marginTop: espaco.xl }}>
        <Botao rotulo="Voltar" variante="outline" onPress={() => router.back()} />
        <Botao rotulo="Montar meu mapa" onPress={avancar} expandir />
      </View>
    </Tela>
  );
}
