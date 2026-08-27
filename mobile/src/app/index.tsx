import { Redirect } from 'expo-router';
import { View } from 'react-native';
import { usePerfil } from '@/state/PerfilContext';
import { cores } from '@/theme';

/**
 * Porta de entrada: quem já tem sessão salva (AsyncStorage) vai direto para
 * Hoje — com ou sem mapa calculado (`'pronto'` ou `'mapa_pendente'`, ambos já
 * têm perfil/sessão válidos; a Home degrada sozinha quando falta leitura).
 * Quem não tem sessão, vai para o onboarding.
 *
 * `'hidratando'` é o instante entre montar o app e terminar de ler o
 * AsyncStorage — não redireciona ainda, senão todo cold start piscaria no
 * onboarding antes de corrigir para Home.
 */
export default function Index() {
  const { status } = usePerfil();

  if (status === 'hidratando') {
    return <View style={{ flex: 1, backgroundColor: cores.bg }} />;
  }
  if (status === 'pronto' || status === 'mapa_pendente') {
    return <Redirect href="/(tabs)/hoje" />;
  }
  return <Redirect href="/(onboarding)/passo-1" />;
}
