import { Tabs } from 'expo-router';
import { Compass, MessageSquare, Orbit, Sun, User } from 'lucide-react-native';
import { cores, layout, regua, texto } from '@/theme';

/**
 * Tab bar de 5 itens: Hoje, Signos, Mapa, Conversa, Perfil.
 * Sinastria NÃO fica aqui — entra pelo card da home e pelo Perfil.
 * A tab bar some no onboarding e na tela de cálculo (grupos irmãos no Stack raiz).
 *
 * Ícones Lucide, como manda o briefing (P2 item 15). Os glifos de texto do
 * protótipo eram placeholder.
 */
export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: cores.accent,
        tabBarInactiveTintColor: cores.neutral500,
        tabBarStyle: {
          backgroundColor: cores.bg,
          borderTopWidth: regua.forte,
          borderTopColor: cores.text,
          paddingBottom: layout.tabBarPaddingBottom,
          height: layout.tabBarPaddingBottom + 56,
          // Sem sombra: o sistema é flat.
          elevation: 0,
          shadowOpacity: 0,
        },
        tabBarLabelStyle: texto.rotuloTabBar,
        tabBarIconStyle: { marginTop: 4 },
      }}
    >
      <Tabs.Screen
        name="hoje"
        options={{
          title: 'Hoje',
          tabBarIcon: ({ color }) => <Sun color={color} size={20} strokeWidth={2} />,
        }}
      />
      <Tabs.Screen
        name="signos"
        options={{
          title: 'Signos',
          tabBarIcon: ({ color }) => <Orbit color={color} size={20} strokeWidth={2} />,
        }}
      />
      <Tabs.Screen
        name="mapa"
        options={{
          title: 'Mapa',
          tabBarIcon: ({ color }) => <Compass color={color} size={20} strokeWidth={2} />,
        }}
      />
      <Tabs.Screen
        name="conversa"
        options={{
          title: 'Conversa',
          tabBarIcon: ({ color }) => (
            <MessageSquare color={color} size={20} strokeWidth={2} />
          ),
        }}
      />
      <Tabs.Screen
        name="perfil"
        options={{
          title: 'Perfil',
          tabBarIcon: ({ color }) => <User color={color} size={20} strokeWidth={2} />,
        }}
      />
    </Tabs>
  );
}
