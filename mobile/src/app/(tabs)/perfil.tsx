import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Tela, Texto } from '@/components';
import { usePerfil } from '@/state/PerfilContext';
import { isoParaBr } from '@/utils/data';
import { cores, espaco, layout, regua } from '@/theme';

/**
 * Perfil.
 *
 * A seção "Metodologias e fontes" é o lugar onde a ressalva do sistema egípcio
 * vive — e o texto vem do campo `metodologia` do próprio serviço, exibido na
 * ÍNTEGRA. Não resumir, não reescrever (CLAUDE.md, "Não fazer").
 */
export default function Perfil() {
  const router = useRouter();
  const { metodologias } = useLocalSearchParams<{ metodologias?: string }>();
  const { perfil, leituras, mapa, recalculo, alternarHoraDesconhecida, tentarRecalcularMapa, sair } =
    usePerfil();
  const [metodologiasAbertas, setMetodologias] = useState(metodologias === '1');

  async function sairEVoltar() {
    await sair();
    router.replace('/');
  }

  // Chegando de Signos > "Qual sistema egípcio usamos e por quê", abre já expandido.
  useEffect(() => {
    if (metodologias === '1') setMetodologias(true);
  }, [metodologias]);

  const resumoNascimento = perfil
    ? [
        isoParaBr(perfil.data_nascimento),
        perfil.hora_desconhecida ? 'hora não informada' : perfil.hora_nascimento,
        perfil.cidade,
      ]
        .filter(Boolean)
        .join(' · ')
    : '';

  const localNascimento = leituras.ocidental
    ? [
        leituras.ocidental.localizacao_usada.nome_completo ??
          leituras.ocidental.localizacao_usada.cidade ??
          perfil?.cidade,
        leituras.ocidental.localizacao_usada.pais ?? perfil?.pais,
      ]
        .filter(Boolean)
        .join(', ')
    : [perfil?.cidade, perfil?.pais].filter(Boolean).join(', ') || '—';

  return (
    <Tela>
      <Texto variante="tituloTela">{perfil?.nome ?? 'Perfil'}</Texto>
      <Texto variante="corpoSecundario" style={{ marginTop: espaco.sm, marginBottom: espaco.xl }}>
        {resumoNascimento}
      </Texto>

      <Linha rotulo="Dados de nascimento" valor={localNascimento} />
      <Linha
        rotulo="Hora exata"
        valor={perfil?.hora_desconhecida ? 'Não informada' : (perfil?.hora_nascimento ?? '—')}
        onPress={alternarHoraDesconhecida}
      />
      <Linha rotulo="Notificação diária" valor="07:30" />
      <Linha rotulo="Sinastria" valor="" onPress={() => router.push('/sinastria')} />

      {/* Conta existe (cadastro deu 201) mas o cálculo falhou silenciosamente
          no servidor — ver PerfilContext.tentarRecalcularMapa. */}
      {!mapa ? (
        <Linha
          rotulo={recalculo.status === 'calculando' ? 'Calculando…' : 'Recalcular mapa'}
          valor={recalculo.status === 'erro' ? (recalculo.mensagem ?? 'Tentar de novo') : ''}
          onPress={recalculo.status === 'calculando' ? undefined : () => void tentarRecalcularMapa()}
        />
      ) : null}

      {/* Acordeão de metodologias. */}
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: metodologiasAbertas }}
        onPress={() => setMetodologias((v) => !v)}
        style={estiloLinha}
      >
        <Texto variante="tituloItem">Metodologias e fontes</Texto>
        <Texto variante="tituloItem">{metodologiasAbertas ? '−' : '+'}</Texto>
      </Pressable>

      {metodologiasAbertas ? (
        <View style={{ gap: espaco.lg, paddingVertical: espaco.lg }}>
          <BlocoMetodologia
            titulo="Ocidental"
            texto={
              leituras.ocidental
                ? `Swiss Ephemeris · casas ${leituras.ocidental.metadata.sistema_casas} · fuso pelo local de nascimento (${leituras.ocidental.localizacao_usada.timezone_iana}).`
                : 'Swiss Ephemeris · casas Placidus · fuso pelo local de nascimento.'
            }
          />
          <BlocoMetodologia
            titulo="Chinês"
            texto={leituras.chines?.metodologia ?? 'Calendário lunissolar chinês.'}
          />
          {/* Texto obrigatório — vem do serviço, exibido na íntegra. */}
          <BlocoMetodologia
            titulo="Egípcio"
            texto={leituras.egipcio?.metodologia ?? ''}
          />
        </View>
      ) : null}

      <Pressable accessibilityRole="button" onPress={() => void sairEVoltar()} style={estiloLinha}>
        <Texto variante="tituloItem" cor={cores.accent700}>
          Sair
        </Texto>
      </Pressable>
    </Tela>
  );
}

/** Linha de lista com feedback pressed: fundo `neutral-200` (regra de interação do DS). */
function estiloLinha({ pressed }: { pressed: boolean }) {
  return {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    paddingVertical: espaco.lg,
    borderBottomWidth: regua.leve,
    borderBottomColor: cores.divider,
    minHeight: layout.alvoMinimo,
    backgroundColor: pressed ? cores.neutral200 : 'transparent',
  };
}

function Linha({
  rotulo,
  valor,
  onPress,
}: {
  rotulo: string;
  valor: string;
  onPress?: () => void;
}) {
  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : undefined}
      onPress={onPress}
      style={estiloLinha}
    >
      <Texto variante="tituloItem">{rotulo}</Texto>
      <Texto variante="corpoSecundario">{valor}</Texto>
    </Pressable>
  );
}

function BlocoMetodologia({ titulo, texto }: { titulo: string; texto: string }) {
  if (!texto) return null;
  return (
    <View
      style={{
        borderLeftWidth: regua.barraLateral,
        borderLeftColor: cores.accent,
        paddingLeft: espaco.md,
      }}
    >
      <Texto variante="kicker">{titulo}</Texto>
      <Texto variante="corpoSecundario" style={{ marginTop: espaco.sm }}>
        {texto}
      </Texto>
    </View>
  );
}
