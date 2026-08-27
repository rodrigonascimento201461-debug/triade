import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { BlocoPoster, Botao, FaixaAvisoHora, Regua, Tela, Texto } from '@/components';
import { usePerfil } from '@/state/PerfilContext';
import { GLIFO_SISTEMA } from '@/data/planetas';
import { dataPorExtenso } from '@/utils/data';
import { api, ErroTriade } from '@/api/client';
import { cores, espaco, layout, regua } from '@/theme';
import type { LeituraDiaria } from '@shared/types/api';
import type { SistemaId } from '@shared/types/astro';

type EstadoLeitura = 'carregando' | 'pronta' | 'indisponivel';

/**
 * Hoje (home). A ordem vertical segue o CLAUDE.md à risca.
 *
 * A frase-síntese do bloco pôster e as frases por sistema vêm de
 * `/api/interpretacao/leitura-diaria` (exige `Authorization: Bearer`, sem
 * corpo — o backend busca o mapa de `mapas_natais` pelo token). Se a Gemini
 * falhar, degrada com honestidade: mostra "em breve" em vez de travar num
 * "carregando" eterno ou inventar uma frase.
 *
 * Regra P0 respeitada: os nomes exibidos nas três linhas saem de `leituras`.
 * Se não houver leitura, mostra "—", nunca um signo de exemplo.
 */
export default function Hoje() {
  const router = useRouter();
  const { primeiroNome, leituras, mapa, horaDuvidosa, recalculo, tentarRecalcularMapa, sair } =
    usePerfil();

  const [leituraDiaria, setLeituraDiaria] = useState<LeituraDiaria | null>(null);
  const [estadoLeitura, setEstadoLeitura] = useState<EstadoLeitura>('carregando');

  const mapaPronto = Boolean(leituras.ocidental && leituras.chines && leituras.egipcio);

  useEffect(() => {
    if (!mapaPronto) return;
    let cancelado = false;

    setEstadoLeitura('carregando');
    api
      .leituraDiaria()
      .then((resposta) => {
        if (cancelado) return;
        setLeituraDiaria(resposta);
        setEstadoLeitura('pronta');
      })
      .catch(async (e) => {
        if (cancelado) return;
        if (e instanceof ErroTriade && e.codigo === 'NAO_AUTENTICADO') {
          // Sessão expirada: limpa e manda pro login.
          await sair();
          router.replace('/entrar');
          return;
        }
        // MAPA_NAO_CALCULADO (não deveria acontecer aqui, mapaPronto já
        // garante que há leitura local) ou INTERPRETACAO_INDISPONIVEL: a tela
        // nunca trava esperando um texto que não vai chegar.
        setEstadoLeitura('indisponivel');
      });

    return () => {
      cancelado = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapaPronto]);

  // Mapeamento do DATA_CONTRACT, campo a campo.
  const linhas: { id: SistemaId; kicker: string; nome: string }[] = [
    {
      id: 'ocidental',
      kicker: 'Ocidental',
      nome: leituras.ocidental ? `Sol em ${leituras.ocidental.sol.signo}` : '—',
    },
    {
      id: 'chines',
      kicker: 'Chinês',
      nome: leituras.chines
        ? `${leituras.chines.animal} de ${leituras.chines.elemento}`
        : '—',
    },
    {
      id: 'egipcio',
      kicker: 'Egípcio',
      nome: leituras.egipcio ? leituras.egipcio.divindade : '—',
    },
  ];

  return (
    <Tela semPaddingHorizontal>
      <View style={{ paddingHorizontal: layout.padding }}>
        <Texto variante="kicker">{dataPorExtenso()}</Texto>
        <Texto variante="tituloTela" style={{ marginTop: espaco.sm }}>
          Olá, {primeiroNome || 'você'}.
        </Texto>
      </View>

      {/* Conta criada mas o backend não conseguiu calcular o mapa (ver
          PerfilContext.tentarRecalcularMapa). Mesma linguagem visual da faixa
          de aviso de hora desconhecida — accent-100 + bordas 2px. */}
      {!mapa ? (
        <View
          accessibilityRole="alert"
          style={{
            marginTop: espaco.xl,
            backgroundColor: cores.accent100,
            borderTopWidth: regua.forte,
            borderBottomWidth: regua.forte,
            borderColor: cores.accent,
            paddingVertical: espaco.lg,
            paddingHorizontal: layout.padding,
          }}
        >
          <Texto variante="corpoAviso">
            Ainda não conseguimos calcular seu mapa. Sua conta está segura —
            só falta essa parte.
          </Texto>
          <Pressable
            accessibilityRole="button"
            onPress={() => void tentarRecalcularMapa()}
            disabled={recalculo.status === 'calculando'}
            style={{ marginTop: espaco.sm, minHeight: layout.alvoMinimo, justifyContent: 'center' }}
          >
            <Texto variante="tituloItem" cor={cores.accent700}>
              {recalculo.status === 'calculando' ? 'Calculando…' : 'Tentar calcular agora'}
            </Texto>
          </Pressable>
          {recalculo.status === 'erro' && recalculo.mensagem ? (
            <Texto variante="corpoAviso" style={{ marginTop: espaco.xs }}>
              {recalculo.mensagem}
            </Texto>
          ) : null}
        </View>
      ) : null}

      {/* Único bloco vermelho da tela. */}
      <View style={{ marginTop: espaco.xl }}>
        <BlocoPoster
          kicker="Triangulação de hoje"
          sintese={
            estadoLeitura === 'pronta' && leituraDiaria
              ? leituraDiaria.sintese
              : 'A leitura de hoje chega em breve.'
          }
          apoio={
            estadoLeitura === 'pronta' && leituraDiaria
              ? leituraDiaria.apoio
              : 'Estamos preparando o cruzamento das três tradições para o seu dia.'
          }
          carregando={estadoLeitura === 'carregando'}
        />
      </View>

      <View style={{ marginTop: espaco.lg }}>
        <FaixaAvisoHora visivel={horaDuvidosa} />
      </View>

      {/* Três linhas: clicar leva para a aba correspondente em Signos. */}
      <View style={{ paddingHorizontal: layout.padding, marginTop: espaco.xl }}>
        {linhas.map((linha) => {
          const frase =
            estadoLeitura === 'pronta' && leituraDiaria ? leituraDiaria.frases[linha.id] : null;
          return (
            <Pressable
              key={linha.id}
              accessibilityRole="button"
              accessibilityLabel={`${linha.kicker}: ${linha.nome}`}
              onPress={() =>
                router.push({ pathname: '/(tabs)/signos', params: { aba: linha.id } })
              }
              style={({ pressed }) => [
                {
                  flexDirection: 'row',
                  paddingVertical: espaco.lg,
                  paddingHorizontal: espaco.sm,
                  marginHorizontal: -espaco.sm,
                  borderBottomWidth: regua.leve,
                  borderBottomColor: cores.divider,
                  minHeight: layout.alvoMinimo,
                  backgroundColor: pressed ? cores.neutral200 : 'transparent',
                },
              ]}
            >
              <View style={{ width: layout.colunaGlifoHome }}>
                <Texto variante="tituloLinha" cor={cores.accent}>
                  {GLIFO_SISTEMA[linha.id]}
                </Texto>
              </View>
              <View style={{ flex: 1 }}>
                <Texto variante="kicker">{linha.kicker}</Texto>
                <Texto variante="tituloLinha" style={{ marginTop: espaco.xs }}>
                  {linha.nome}
                </Texto>
                {frase ? (
                  <Texto variante="corpoSecundario" style={{ marginTop: espaco.xs }}>
                    {frase}
                  </Texto>
                ) : null}
              </View>
            </Pressable>
          );
        })}
      </View>

      <View style={{ paddingHorizontal: layout.padding, marginTop: espaco.xl }}>
        <Botao
          rotulo="Conversar sobre hoje"
          variante="preto"
          seta
          expandir
          onPress={() => router.push('/(tabs)/conversa')}
        />
      </View>

      {/* Próximos trânsitos — P1 item 6: precisa de endpoint novo no serviço
          Python (posições de hoje x mapa natal, com orbe). NÃO inventar textos. */}
      <View style={{ paddingHorizontal: layout.padding, marginTop: espaco.xxl }}>
        <Texto variante="kicker">Próximos trânsitos</Texto>
        <Regua style={{ marginTop: espaco.md }} />
        <Texto variante="corpoSecundario" style={{ marginTop: espaco.md }}>
          Em breve.
        </Texto>
      </View>

      {/* Card de sinastria: borda 2px. Entrada para a tela fora da tab bar. */}
      <View style={{ paddingHorizontal: layout.padding, marginTop: espaco.xxl }}>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push('/sinastria')}
          style={({ pressed }) => ({
            borderWidth: regua.forte,
            borderColor: cores.text,
            padding: espaco.lg,
            minHeight: layout.alvoMinimo,
            backgroundColor: pressed ? cores.neutral200 : 'transparent',
          })}
        >
          <Texto variante="kicker">Sinastria</Texto>
          <Texto variante="tituloCard" style={{ marginTop: espaco.sm }}>
            Cruzar seu mapa com o de outra pessoa
          </Texto>
        </Pressable>
      </View>
    </Tela>
  );
}
