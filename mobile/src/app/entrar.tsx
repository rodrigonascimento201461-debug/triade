import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { Botao, Campo, Tela, Texto } from '@/components';
import { usePerfil } from '@/state/PerfilContext';
import { cores, espaco, layout } from '@/theme';

/**
 * Login — fora do grupo `(onboarding)` de propósito: não tem os 3 passos, não
 * usa `RascunhoOnboarding`, e ao logar com sucesso pula o onboarding inteiro
 * (a resposta de `/api/auth/login` já traz perfil + mapa prontos).
 *
 * Reaproveita a máquina de estados de `PerfilContext` (`status`/`erro`) — o
 * mesmo padrão de `calculando.tsx`: chama `entrar()`, que nunca lança, e reage
 * à mudança de `status` num efeito.
 */
export default function Entrar() {
  const router = useRouter();
  const { status, erro, entrar } = usePerfil();

  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [tentouEnviar, setTentouEnviar] = useState(false);

  const carregando = status === 'calculando' && tentouEnviar;
  const falhou = tentouEnviar && status === 'erro';

  useEffect(() => {
    if (tentouEnviar && (status === 'pronto' || status === 'mapa_pendente')) {
      router.replace('/(tabs)/hoje');
    }
  }, [status, tentouEnviar, router]);

  function enviar() {
    if (!email.trim() || !senha) return;
    setTentouEnviar(true);
    void entrar({ email: email.trim().toLowerCase(), senha });
  }

  return (
    <Tela>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Voltar"
        onPress={() => router.back()}
        style={({ pressed }) => ({
          flexDirection: 'row',
          alignItems: 'center',
          gap: espaco.xs,
          marginBottom: espaco.xxl,
          alignSelf: 'flex-start',
          minHeight: layout.alvoMinimo,
          opacity: pressed ? 0.6 : 1,
        })}
      >
        <ChevronLeft color={cores.text} size={18} strokeWidth={2.5} />
        <Texto variante="kicker">Voltar</Texto>
      </Pressable>

      <Texto variante="tituloOnboarding">Bem-vindo de volta</Texto>
      <Texto variante="corpoSecundario" style={{ marginTop: espaco.md, marginBottom: espaco.xl }}>
        Entre com seu e-mail e senha para ver seu mapa.
      </Texto>

      <Campo
        rotulo="E-mail"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="email-address"
        placeholder="voce@exemplo.com"
        editable={!carregando}
      />
      <Campo
        rotulo="Senha"
        value={senha}
        onChangeText={setSenha}
        autoCapitalize="none"
        autoCorrect={false}
        secureTextEntry
        placeholder="Sua senha"
        editable={!carregando}
        erro={falhou ? erro?.mensagem : undefined}
      />

      <View style={{ marginTop: espaco.xl }}>
        <Botao
          rotulo={carregando ? 'Entrando…' : 'Entrar'}
          onPress={enviar}
          desabilitado={carregando}
          expandir
        />
      </View>
    </Tela>
  );
}
