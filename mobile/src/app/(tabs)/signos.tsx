import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Regua, Tela, Texto } from '@/components';
import { usePerfil } from '@/state/PerfilContext';
import { dadosDoSigno } from '@/data/correspondencias';
import { api, ErroTriade } from '@/api/client';
import { cores, espaco, layout, regua } from '@/theme';
import type { SistemaId } from '@shared/types/astro';
import type { InterpretacaoSignos } from '@shared/types/api';

/**
 * Signos — uma tela, três abas.
 *
 * Decisão de produto do briefing: o egípcio tem o MESMO peso visual dos outros.
 * A ressalva metodológica vive no Perfil, não como aviso aqui.
 *
 * Regra P0: todo nome exibido sai de `leituras`, que vem da API. Quando não há
 * leitura, a tela diz que não há — nunca mostra um signo de exemplo.
 */

const ABAS: { id: SistemaId; rotulo: string }[] = [
  { id: 'ocidental', rotulo: 'Ocidental' },
  { id: 'chines', rotulo: 'Chinês' },
  { id: 'egipcio', rotulo: 'Egípcio' },
];

export default function Signos() {
  const router = useRouter();
  const { aba } = useLocalSearchParams<{ aba?: SistemaId }>();
  const [ativa, setAtiva] = useState<SistemaId>(aba ?? 'ocidental');
  const { leituras, sair } = usePerfil();

  // Dois parágrafos por sistema, sobre a pessoa — /api/interpretacao/signos
  // (exige Authorization, sem corpo). A tela cai no fallback "Interpretação
  // em breve." sem travar nada quando a Gemini falha.
  const [interpretacao, setInterpretacao] = useState<InterpretacaoSignos | null>(null);
  const mapaPronto = Boolean(leituras.ocidental && leituras.chines && leituras.egipcio);

  useEffect(() => {
    if (!mapaPronto) return;
    let cancelado = false;
    api
      .interpretacaoSignos()
      .then((resposta) => {
        if (!cancelado) setInterpretacao(resposta);
      })
      .catch(async (e) => {
        if (cancelado) return;
        if (e instanceof ErroTriade && e.codigo === 'NAO_AUTENTICADO') {
          await sair();
          router.replace('/entrar');
          return;
        }
        // MAPA_NAO_CALCULADO / INTERPRETACAO_INDISPONIVEL — cada painel já
        // cai no fallback próprio ("Interpretação em breve.").
      });
    return () => {
      cancelado = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapaPronto]);

  return (
    <Tela>
      <Texto variante="tituloTela">Seus signos</Texto>

      {/* Abas: flex 1 cada, alinhadas à esquerda, régua 2px embaixo,
          sublinhado vermelho de 4px na ativa. */}
      <View style={{ flexDirection: 'row', marginTop: espaco.xl }}>
        {ABAS.map((item) => {
          const selecionada = item.id === ativa;
          return (
            <Pressable
              key={item.id}
              accessibilityRole="tab"
              accessibilityState={{ selected: selecionada }}
              onPress={() => setAtiva(item.id)}
              style={{ flex: 1, minHeight: layout.alvoMinimo, justifyContent: 'flex-end' }}
            >
              <Texto
                variante="kicker"
                cor={selecionada ? cores.text : cores.neutral500}
                style={{ marginBottom: espaco.md }}
              >
                {item.rotulo}
              </Texto>
              <View
                style={{
                  height: selecionada ? regua.abaAtiva : regua.forte,
                  backgroundColor: selecionada ? cores.accent : cores.text,
                }}
              />
            </Pressable>
          );
        })}
      </View>

      <View style={{ marginTop: espaco.xl }}>
        {ativa === 'ocidental' ? (
          <PainelOcidental paragrafos={interpretacao?.ocidental.paragrafos} />
        ) : null}
        {ativa === 'chines' ? <PainelChines paragrafos={interpretacao?.chines.paragrafos} /> : null}
        {ativa === 'egipcio' ? (
          <PainelEgipcio paragrafos={interpretacao?.egipcio.paragrafos} />
        ) : null}
      </View>
    </Tela>
  );
}

/** Sem leitura ainda: não invente um signo de exemplo. */
function SemDados() {
  return <Texto variante="corpoSecundario">Ainda não calculamos esta leitura.</Texto>;
}

/** Parágrafos interpretativos, com fallback honesto enquanto a IA não responde. */
function Paragrafos({ paragrafos }: { paragrafos?: string[] }) {
  if (!paragrafos || paragrafos.length === 0) {
    return <Texto variante="corpoSecundario">Interpretação em breve.</Texto>;
  }
  return (
    <View style={{ gap: espaco.md }}>
      {paragrafos.map((p, i) => (
        <Texto key={i} variante="corpoMenor">
          {p}
        </Texto>
      ))}
    </View>
  );
}

function PainelOcidental({ paragrafos }: { paragrafos?: string[] }) {
  const { leituras } = usePerfil();
  const mapa = leituras.ocidental;
  if (!mapa) return <SemDados />;

  const derivado = dadosDoSigno(mapa.sol.signo);

  return (
    <View>
      <Texto variante="nomeSigno">{mapa.sol.signo}</Texto>
      <Texto variante="corpoSecundario" style={{ marginTop: espaco.md }}>
        {`Sol em ${mapa.sol.signo} · Lua em ${mapa.lua.signo} · Ascendente em ${mapa.ascendente.signo}`}
      </Texto>
      <Regua style={{ marginTop: espaco.lg, marginBottom: espaco.lg }} />

      <Paragrafos paragrafos={paragrafos} />

      {/* Grid 2x2 com separadores de 2px. Elemento/Regente/Modo saem da tabela
          local; Fonte vem de metadata.sistema_casas. */}
      {derivado ? (
        <View
          style={{
            marginTop: espaco.xl,
            borderTopWidth: regua.forte,
            borderColor: cores.text,
          }}
        >
          <Celula rotulo="Elemento" valor={derivado.elemento} />
          <Celula rotulo="Regente" valor={derivado.regente} />
          <Celula rotulo="Modo" valor={derivado.modalidade} />
          <Celula rotulo="Fonte" valor={`${mapa.metadata.sistema_casas} · Swiss Eph.`} />
        </View>
      ) : null}
    </View>
  );
}

function Celula({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <View
      style={{
        paddingVertical: espaco.md,
        borderBottomWidth: regua.forte,
        borderColor: cores.text,
      }}
    >
      <Texto variante="kicker">{rotulo}</Texto>
      <Texto variante="tituloItem" style={{ marginTop: espaco.xs }}>
        {valor}
      </Texto>
    </View>
  );
}

function PainelChines({ paragrafos }: { paragrafos?: string[] }) {
  const { perfil, leituras } = usePerfil();
  const chines = leituras.chines;
  if (!chines) return <SemDados />;

  // Comparar o ano efetivo com o ano digitado: se diferem, a pessoa nasceu
  // antes do Ano Novo Chinês e o ciclo é o do ano anterior.
  const anoDigitado = Number(perfil?.data_nascimento?.slice(0, 4));
  const antesDoAnoNovo =
    Number.isFinite(anoDigitado) && chines.ano_efetivo_calculo !== anoDigitado;

  return (
    <View>
      <Texto variante="nomeSigno">{chines.animal}</Texto>
      <Texto variante="nomeSigno" cor={cores.accent}>
        de {chines.elemento}
      </Texto>
      <Texto variante="corpoSecundario" style={{ marginTop: espaco.md }}>
        {[
          String(chines.ano_efetivo_calculo),
          // P1 item 7: tronco/ramo ainda não vêm do serviço.
          chines.tronco_celeste && chines.ramo_terrestre
            ? `Tronco ${chines.tronco_celeste} · Ramo ${chines.ramo_terrestre}`
            : null,
          chines.yin_yang,
        ]
          .filter(Boolean)
          .join(' · ')}
      </Texto>
      <Regua style={{ marginTop: espaco.lg, marginBottom: espaco.lg }} />

      <Paragrafos paragrafos={paragrafos} />

      <View
        style={{
          marginTop: espaco.xl,
          borderWidth: regua.forte,
          borderColor: cores.text,
          padding: espaco.lg,
        }}
      >
        <Texto variante="kicker">Corte do ano novo</Texto>
        <Texto variante="corpoMenor" style={{ marginTop: espaco.sm }}>
          {antesDoAnoNovo
            ? `Você nasceu antes do Ano Novo Chinês de ${anoDigitado}, então seu ciclo é o de ${chines.ano_efetivo_calculo}.`
            : 'O calendário chinês é lunissolar: o ano vira entre o fim de janeiro e o fim de fevereiro, não no dia 1º.'}
        </Texto>
      </View>
    </View>
  );
}

function PainelEgipcio({ paragrafos }: { paragrafos?: string[] }) {
  const router = useRouter();
  const { leituras } = usePerfil();
  const egipcio = leituras.egipcio;
  if (!egipcio) return <SemDados />;

  return (
    <View>
      <Texto variante="nomeSigno">{egipcio.divindade}</Texto>
      <Texto variante="corpoSecundario" style={{ marginTop: espaco.md }}>
        {egipcio.periodo}
      </Texto>
      <Regua style={{ marginTop: espaco.lg, marginBottom: espaco.lg }} />

      <Paragrafos paragrafos={paragrafos} />

      {/* Linha clicável -> Perfil, seção Metodologias, já expandida.
          A ressalva NÃO vira aviso nesta tela (decisão de produto). */}
      <Pressable
        accessibilityRole="link"
        accessibilityLabel="Qual sistema egípcio usamos e por quê"
        onPress={() => router.push({ pathname: '/(tabs)/perfil', params: { metodologias: '1' } })}
        style={({ pressed }) => ({
          marginTop: espaco.xl,
          paddingVertical: espaco.lg,
          borderTopWidth: regua.forte,
          borderBottomWidth: regua.forte,
          borderColor: cores.text,
          minHeight: layout.alvoMinimo,
          backgroundColor: pressed ? cores.neutral200 : 'transparent',
        })}
      >
        <Texto variante="tituloItem">Qual sistema egípcio usamos e por quê</Texto>
      </Pressable>
    </View>
  );
}
