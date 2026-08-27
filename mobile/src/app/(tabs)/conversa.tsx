import { useRef, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Regua, Texto } from '@/components';
import { usePerfil } from '@/state/PerfilContext';
import { ErroTriade, conversaStream } from '@/api/client';
import { cores, espaco, layout, raio, regua } from '@/theme';
import type { Mensagem } from '@shared/types/api';

/**
 * Sugestões de pergunta — copy de produto, não nome de signo: não viola a
 * regra P0. Rolam horizontalmente, borda 2px, invertem no pressed.
 */
const SUGESTOES = [
  'O que isso significa pra mim?',
  'Fale mais sobre meu Ascendente',
  'Como as três tradições conversam entre si?',
  'O que esperar da semana?',
];

/**
 * Conversa.
 *
 * A IA aparece como bloco à esquerda com barra vermelha de 3px e kicker
 * "TRÍADE" — sem balão. O usuário aparece como bloco preto à direita, no
 * máximo 82% de largura.
 *
 * `/api/conversa` é streaming (SSE): o texto da Tríade aparece incrementalmente
 * conforme os deltas chegam (efeito de "digitando"), não tudo de uma vez no
 * final. `escrevendo…` fica visível só até o primeiro delta chegar — depois
 * disso, é o próprio texto crescendo na bolha que comunica "ainda gerando".
 */
export default function Conversa() {
  const router = useRouter();
  const { leituras, sair } = usePerfil();
  const [mensagens, setMensagens] = useState<Mensagem[]>([]);
  const [entrada, setEntrada] = useState('');
  const [digitando, setDigitando] = useState(false);
  const listaRef = useRef<FlatList<Mensagem>>(null);

  function rolarParaFim() {
    requestAnimationFrame(() => listaRef.current?.scrollToEnd({ animated: true }));
  }

  async function enviarTexto(texto: string) {
    const limpo = texto.trim();
    if (!limpo || digitando) return;

    const mensagemUsuario: Mensagem = {
      id: `${Date.now()}-usuario`,
      papel: 'usuario',
      texto: limpo,
      criada_em: new Date().toISOString(),
    };

    setMensagens((atual) => [...atual, mensagemUsuario]);
    setEntrada('');
    setDigitando(true);
    rolarParaFim();

    const idResposta = `${Date.now()}-triade`;
    let respostaIniciada = false;

    try {
      await conversaStream(limpo, (pedaco) => {
        if (pedaco.tipo !== 'delta') return;

        if (!respostaIniciada) {
          respostaIniciada = true;
          setDigitando(false);
          setMensagens((atual) => [
            ...atual,
            { id: idResposta, papel: 'triade', texto: pedaco.texto, criada_em: new Date().toISOString() },
          ]);
        } else {
          setMensagens((atual) =>
            atual.map((m) => (m.id === idResposta ? { ...m, texto: m.texto + pedaco.texto } : m)),
          );
        }
        rolarParaFim();
      });
    } catch (e) {
      if (e instanceof ErroTriade && e.codigo === 'NAO_AUTENTICADO') {
        await sair();
        router.replace('/entrar');
        return;
      }
      const foiMapaNaoCalculado = e instanceof ErroTriade && e.codigo === 'MAPA_NAO_CALCULADO';
      const foiIndisponivel = e instanceof ErroTriade && e.codigo === 'INTERPRETACAO_INDISPONIVEL';
      setMensagens((atual) => [
        ...atual,
        {
          id: `${Date.now()}-erro`,
          papel: 'triade',
          texto: foiMapaNaoCalculado
            ? 'Calcule seu mapa primeiro — assim que ele estiver pronto, dá pra conversar sobre ele aqui.'
            : foiIndisponivel
              ? 'Não consegui pensar numa resposta agora. Tenta de novo em instantes?'
              : 'Não consegui responder agora. Tenta de novo em instantes?',
          criada_em: new Date().toISOString(),
        },
      ]);
    } finally {
      setDigitando(false);
      rolarParaFim();
    }
  }

  const mapaDisponivel = Boolean(leituras.ocidental);

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: cores.bg }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Cabeçalho fixo. */}
      <View style={{ paddingTop: layout.paddingTop, paddingHorizontal: layout.padding }}>
        <Texto variante="kicker">Sobre o seu mapa</Texto>
        <Texto variante="tituloCompacto" style={{ marginTop: espaco.xs, marginBottom: espaco.md }}>
          Conversa
        </Texto>
      </View>
      <Regua />

      <FlatList
        ref={listaRef}
        data={mensagens}
        keyExtractor={(m) => m.id}
        contentContainerStyle={{ padding: layout.padding, gap: espaco.xl, flexGrow: 1 }}
        ListEmptyComponent={
          <Texto variante="corpoSecundario">
            {mapaDisponivel
              ? 'Pergunte qualquer coisa sobre o seu mapa.'
              : 'Assim que seu mapa estiver calculado, você pode perguntar qualquer coisa sobre ele aqui.'}
          </Texto>
        }
        renderItem={({ item }) =>
          item.papel === 'triade' ? (
            <View
              style={{
                borderLeftWidth: regua.barraLateral,
                borderLeftColor: cores.accent,
                paddingLeft: espaco.md,
              }}
            >
              <Texto variante="kicker">Tríade</Texto>
              <Texto variante="corpoMenor" style={{ marginTop: espaco.sm }}>
                {item.texto}
              </Texto>
            </View>
          ) : (
            <View
              style={{
                alignSelf: 'flex-end',
                maxWidth: layout.maxLarguraMensagem,
                backgroundColor: cores.text,
                padding: espaco.md,
                borderRadius: raio,
              }}
            >
              <Texto variante="corpoMenor" cor={cores.bg}>
                {item.texto}
              </Texto>
            </View>
          )
        }
      />

      {digitando ? (
        <Texto
          variante="kicker"
          style={{ paddingHorizontal: layout.padding, paddingBottom: espaco.md }}
        >
          escrevendo…
        </Texto>
      ) : null}

      {/* Fila horizontal rolável de sugestões. */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: layout.padding,
          paddingBottom: espaco.md,
          gap: espaco.sm,
        }}
      >
        {SUGESTOES.map((sugestao) => (
          <SugestaoChip
            key={sugestao}
            rotulo={sugestao}
            desabilitada={digitando}
            onPress={() => void enviarTexto(sugestao)}
          />
        ))}
      </ScrollView>

      <View
        style={{
          flexDirection: 'row',
          gap: espaco.sm,
          padding: layout.padding,
          borderTopWidth: regua.forte,
          borderTopColor: cores.text,
        }}
      >
        <TextInput
          value={entrada}
          onChangeText={setEntrada}
          onSubmitEditing={() => void enviarTexto(entrada)}
          returnKeyType="send"
          editable={!digitando}
          placeholder="Escreva aqui"
          placeholderTextColor={cores.neutral500}
          accessibilityLabel="Mensagem"
          style={{
            flex: 1,
            borderWidth: regua.forte,
            borderColor: cores.text,
            borderRadius: raio,
            padding: 14,
            minHeight: layout.alvoMinimo,
            fontFamily: 'Archivo_500Medium',
            fontSize: 17,
            color: cores.text,
            opacity: digitando ? 0.5 : 1,
          }}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Enviar"
          disabled={digitando}
          onPress={() => void enviarTexto(entrada)}
          style={({ pressed }) => ({
            width: layout.alvoMinimo,
            minHeight: layout.alvoMinimo,
            backgroundColor: pressed ? cores.accent600 : cores.accent,
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: raio,
            opacity: digitando ? 0.5 : 1,
          })}
        >
          <Texto variante="botao" cor={cores.sobreAccent}>
            →
          </Texto>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

/** Chip de sugestão: borda 2px, inverte (fundo texto/cor bg) no pressed. */
function SugestaoChip({
  rotulo,
  onPress,
  desabilitada,
}: {
  rotulo: string;
  onPress: () => void;
  desabilitada: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={desabilitada}
      onPress={onPress}
      style={({ pressed }) => ({
        borderWidth: regua.forte,
        borderColor: cores.text,
        backgroundColor: pressed ? cores.text : 'transparent',
        paddingHorizontal: espaco.md,
        minHeight: layout.alvoMinimo,
        justifyContent: 'center',
        opacity: desabilitada ? 0.5 : 1,
      })}
    >
      {({ pressed }) => (
        <Texto variante="corpoMenor" cor={pressed ? cores.bg : cores.text}>
          {rotulo}
        </Texto>
      )}
    </Pressable>
  );
}
