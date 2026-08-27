import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import {
  useFonts,
  Archivo_400Regular,
  Archivo_500Medium,
  Archivo_600SemiBold,
  Archivo_700Bold,
  Archivo_800ExtraBold,
  Archivo_900Black,
} from '@expo-google-fonts/archivo';
import { PerfilProvider } from '@/state/PerfilContext';
import { cores } from '@/theme';

/**
 * Layout raiz.
 * - Carrega Archivo nos 6 pesos (única fonte do projeto — não trocar).
 * - A tab bar não aparece no onboarding nem na tela de cálculo: por isso
 *   `(onboarding)` e `(tabs)` são grupos irmãos deste Stack.
 */
export default function RootLayout() {
  const [fontesCarregadas] = useFonts({
    Archivo_400Regular,
    Archivo_500Medium,
    Archivo_600SemiBold,
    Archivo_700Bold,
    Archivo_800ExtraBold,
    Archivo_900Black,
  });

  if (!fontesCarregadas) {
    // Sem Archivo, qualquer texto renderiza na fonte do sistema e quebra o DS.
    return <View style={{ flex: 1, backgroundColor: cores.bg }} />;
  }

  return (
    <PerfilProvider>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: cores.bg },
          animation: 'none', // sistema flat e estático de propósito
        }}
      >
        <Stack.Screen name="(onboarding)" />
        <Stack.Screen name="(tabs)" />
        {/* Sinastria não fica na tab bar: entra pelo card da home e pelo Perfil. */}
        <Stack.Screen name="sinastria" options={{ presentation: 'card' }} />
        {/* Login: fora do onboarding, acessível pelo link "Já tem conta?" no passo 1. */}
        <Stack.Screen name="entrar" options={{ presentation: 'card' }} />
      </Stack>
    </PerfilProvider>
  );
}
