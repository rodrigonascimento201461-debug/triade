import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { Botao, Campo, Tela, Texto } from '@/components';
import { usePerfil } from '@/state/PerfilContext';
import { api, ErroTriade } from '@/api/client';
import { brParaIso } from '@/utils/data';
import { cores, espaco, layout, raio, regua } from '@/theme';
import type { MapaOcidental, SignoChines, SistemaEgipcio } from '@shared/types/astro';

const HORA_VALIDA = /^([01]\d|2[0-3]):[0-5]\d$/;

interface Cruzamento {
  id: string;
  nome: string;
  ocidental: MapaOcidental;
  chines: SignoChines;
  egipcio: SistemaEgipcio;
}

type Modo = 'nenhum' | 'convidar' | 'formulario';

/**
 * Sinastria — fora da tab bar de propósito: entra pelo card da home e pelo
 * Perfil.
 *
 * BLOQUEIO conhecido (P1 item 8): NÃO existe fórmula de compatibilidade
 * definida nem endpoint de sinastria no backend. Mostrar uma porcentagem aqui
 * seria o mesmo tipo de mentira que os signos fixos do protótipo original —
 * por isso a coluna de porcentagem do design vira um rótulo "em breve" e o
 * texto de relação por sistema também.
 *
 * O que É real: "Digitar dados" chama os três endpoints de cálculo (que
 * funcionam de verdade) para a outra pessoa e cruza os signos calculados —
 * sem inventar nada além do rótulo do tipo de relação.
 */
export default function Sinastria() {
  const router = useRouter();
  const { perfil, leituras } = usePerfil();

  const [modo, setModo] = useState<Modo>('nenhum');
  const [cruzamentos, setCruzamentos] = useState<Cruzamento[]>([]);
  const [selecionado, setSelecionado] = useState<string | null>(null);

  const meuMapaPronto = Boolean(leituras.ocidental && leituras.chines && leituras.egipcio);
  const itemSelecionado = cruzamentos.find((c) => c.id === selecionado) ?? null;

  function adicionarCruzamento(c: Cruzamento) {
    setCruzamentos((atual) => [...atual, c]);
    setSelecionado(c.id);
    setModo('nenhum');
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
          marginBottom: espaco.xl,
          alignSelf: 'flex-start',
          minHeight: layout.alvoMinimo,
          opacity: pressed ? 0.6 : 1,
        })}
      >
        <ChevronLeft color={cores.text} size={18} strokeWidth={2.5} />
        <Texto variante="kicker">Voltar</Texto>
      </Pressable>

      <Texto variante="tituloTela">Sinastria</Texto>
      <Texto variante="corpoSecundario" style={{ marginTop: espaco.md, marginBottom: espaco.xl }}>
        Cruze seu mapa com o de outra pessoa e veja como as três tradições
        conversam entre si.
      </Texto>

      <View style={{ flexDirection: 'row', gap: espaco.md }}>
        <Botao
          rotulo="Convidar"
          expandir
          onPress={() => setModo((m) => (m === 'convidar' ? 'nenhum' : 'convidar'))}
        />
        <Botao
          rotulo="Digitar dados"
          variante="outline"
          expandir
          onPress={() => setModo((m) => (m === 'formulario' ? 'nenhum' : 'formulario'))}
        />
      </View>

      {modo === 'convidar' ? (
        <View
          style={{
            marginTop: espaco.lg,
            backgroundColor: cores.accent100,
            borderTopWidth: regua.forte,
            borderBottomWidth: regua.forte,
            borderColor: cores.accent,
            padding: espaco.lg,
          }}
        >
          <Texto variante="corpoAviso">
            Convidar alguém pelo app ainda não existe — por enquanto, use
            &quot;Digitar dados&quot; com as informações de nascimento da pessoa.
          </Texto>
        </View>
      ) : null}

      {modo === 'formulario' ? (
        <FormularioOutraPessoa
          desabilitado={!meuMapaPronto}
          onCriar={adicionarCruzamento}
        />
      ) : null}

      <View style={{ marginTop: espaco.xxl }}>
        <Texto variante="kicker">Cruzamentos</Texto>
        {cruzamentos.length === 0 ? (
          <Texto variante="corpoSecundario" style={{ marginTop: espaco.md }}>
            Nenhum cruzamento ainda.
          </Texto>
        ) : (
          <View style={{ marginTop: espaco.md }}>
            {cruzamentos.map((c) => (
              <LinhaCruzamento
                key={c.id}
                cruzamento={c}
                ativo={c.id === selecionado}
                onPress={() => setSelecionado((s) => (s === c.id ? null : c.id))}
              />
            ))}
          </View>
        )}
      </View>

      {itemSelecionado && leituras.ocidental && leituras.chines && leituras.egipcio ? (
        <DetalheCruzamento
          cruzamento={itemSelecionado}
          meuOcidental={leituras.ocidental}
          meuChines={leituras.chines}
          meuEgipcio={leituras.egipcio}
          meuNome={perfil?.nome ?? 'Você'}
        />
      ) : null}
    </Tela>
  );
}

function LinhaCruzamento({
  cruzamento,
  ativo,
  onPress,
}: {
  cruzamento: Cruzamento;
  ativo: boolean;
  onPress: () => void;
}) {
  const signos = `${cruzamento.ocidental.sol.signo} · ${cruzamento.chines.animal} de ${cruzamento.chines.elemento} · ${cruzamento.egipcio.divindade}`;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: ativo }}
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: espaco.lg,
        borderBottomWidth: regua.leve,
        borderBottomColor: cores.divider,
        minHeight: layout.alvoMinimo,
        backgroundColor: pressed || ativo ? cores.neutral200 : 'transparent',
      })}
    >
      <View style={{ width: layout.colunaPorcentagem }}>
        {/* Sem fórmula definida (P1 item 8): nunca um número decorativo. */}
        <Texto variante="kicker" cor={cores.accent}>
          Em breve
        </Texto>
      </View>
      <View style={{ flex: 1 }}>
        <Texto variante="tituloCard">{cruzamento.nome}</Texto>
        <Texto variante="corpoSecundario" style={{ marginTop: 2 }}>
          {signos}
        </Texto>
      </View>
      <ChevronRight color={cores.neutral600} size={18} strokeWidth={2} />
    </Pressable>
  );
}

function DetalheCruzamento({
  cruzamento,
  meuOcidental,
  meuChines,
  meuEgipcio,
  meuNome,
}: {
  cruzamento: Cruzamento;
  meuOcidental: MapaOcidental;
  meuChines: SignoChines;
  meuEgipcio: SistemaEgipcio;
  meuNome: string;
}) {
  return (
    <View
      style={{
        marginTop: espaco.xl,
        borderWidth: regua.forte,
        borderColor: cores.text,
        padding: espaco.lg,
      }}
    >
      <Texto variante="tituloLinha">{cruzamento.nome}</Texto>
      <Texto variante="corpoSecundario" style={{ marginTop: espaco.xs, marginBottom: espaco.lg }}>
        Como {meuNome || 'você'} e {cruzamento.nome} se cruzam nas três tradições.
      </Texto>
      <Texto variante="corpoMenor">
        A leitura de compatibilidade por sistema ainda não tem método definido
        — preferimos não mostrar um número ou rótulo inventado. Os signos
        calculados abaixo são reais.
      </Texto>

      <View
        style={{
          flexDirection: 'row',
          marginTop: espaco.lg,
          borderTopWidth: regua.forte,
          borderColor: cores.text,
        }}
      >
        <CelulaSistema
          rotulo="Ocidental"
          meu={meuOcidental.sol.signo}
          outro={cruzamento.ocidental.sol.signo}
        />
        <CelulaSistema
          rotulo="Chinês"
          meu={`${meuChines.animal} de ${meuChines.elemento}`}
          outro={`${cruzamento.chines.animal} de ${cruzamento.chines.elemento}`}
        />
        <CelulaSistema
          rotulo="Egípcio"
          meu={meuEgipcio.divindade}
          outro={cruzamento.egipcio.divindade}
        />
      </View>
    </View>
  );
}

function CelulaSistema({ rotulo, meu, outro }: { rotulo: string; meu: string; outro: string }) {
  return (
    <View
      style={{
        flex: 1,
        borderRightWidth: regua.forte,
        borderColor: cores.text,
        paddingVertical: espaco.md,
        paddingHorizontal: espaco.sm,
      }}
    >
      <Texto variante="kicker">{rotulo}</Texto>
      <Texto variante="corpoSecundario" style={{ marginTop: espaco.sm }}>
        {meu}
      </Texto>
      <Texto variante="corpoSecundario">{outro}</Texto>
    </View>
  );
}

function FormularioOutraPessoa({
  desabilitado,
  onCriar,
}: {
  desabilitado: boolean;
  onCriar: (c: Cruzamento) => void;
}) {
  const [nome, setNome] = useState('');
  const [data, setData] = useState('');
  const [hora, setHora] = useState('');
  const [semHora, setSemHora] = useState(false);
  const [cidade, setCidade] = useState('');
  const [pais, setPais] = useState('Brasil');
  const [carregando, setCarregando] = useState(false);
  const [erros, setErros] = useState<{ nome?: string; data?: string; hora?: string; cidade?: string }>(
    {},
  );

  async function calcular() {
    const iso = brParaIso(data);
    const novoErros: typeof erros = {};
    if (!nome.trim()) novoErros.nome = 'Como essa pessoa se chama?';
    if (!iso || new Date(`${iso}T00:00:00Z`).getTime() >= Date.now()) {
      novoErros.data = iso === null ? 'Use o formato DD/MM/AAAA.' : 'A data precisa estar no passado.';
    }
    if (!semHora && !HORA_VALIDA.test(hora.trim())) {
      novoErros.hora = 'Use o formato HH:MM, em 24 horas.';
    }
    if (!cidade.trim()) novoErros.cidade = 'Cidade obrigatória.';

    setErros(novoErros);
    if (Object.keys(novoErros).length > 0 || !iso) return;

    setCarregando(true);
    try {
      const dados = {
        data_nascimento: iso,
        hora_nascimento: semHora ? '12:00' : hora.trim(),
        hora_desconhecida: semHora,
        cidade: cidade.trim(),
        pais: pais.trim() || 'Brasil',
      };
      const [ocidental, chines, egipcio] = await Promise.all([
        api.mapaOcidental(dados),
        api.signoChines(dados.data_nascimento),
        api.sistemaEgipcio(dados.data_nascimento),
      ]);
      onCriar({ id: String(Date.now()), nome: nome.trim(), ocidental, chines, egipcio });
      setNome('');
      setData('');
      setHora('');
      setSemHora(false);
      setCidade('');
    } catch (e) {
      if (e instanceof ErroTriade && e.codigo === 'GEOCODING_FALHOU') {
        setErros({ cidade: e.message });
      } else {
        setErros({ cidade: 'Não deu para calcular agora. Tenta de novo em instantes.' });
      }
    } finally {
      setCarregando(false);
    }
  }

  return (
    <View
      style={{
        marginTop: espaco.lg,
        borderWidth: regua.forte,
        borderColor: cores.text,
        padding: espaco.lg,
      }}
    >
      <Texto variante="kicker" style={{ marginBottom: espaco.lg }}>
        Dados da outra pessoa
      </Texto>

      {desabilitado ? (
        <Texto variante="corpoSecundario" style={{ marginBottom: espaco.lg }}>
          Calcule seu próprio mapa primeiro para poder cruzar com o de outra
          pessoa.
        </Texto>
      ) : null}

      <Campo rotulo="Nome" value={nome} onChangeText={setNome} erro={erros.nome} autoCapitalize="words" />
      <Campo
        rotulo="Data de nascimento"
        value={data}
        onChangeText={setData}
        erro={erros.data}
        keyboardType="number-pad"
        maxLength={10}
        placeholder="DD/MM/AAAA"
      />
      <Campo
        rotulo="Hora de nascimento"
        value={hora}
        onChangeText={setHora}
        erro={erros.hora}
        editable={!semHora}
        keyboardType="number-pad"
        maxLength={5}
        placeholder="HH:MM"
        style={semHora ? { opacity: 0.4 } : undefined}
      />
      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked: semHora }}
        accessibilityLabel="Não sei a hora exata"
        onPress={() => setSemHora((v) => !v)}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: espaco.md,
          minHeight: layout.alvoMinimo,
          marginBottom: espaco.md,
        }}
      >
        <View
          style={{
            width: 22,
            height: 22,
            borderWidth: regua.forte,
            borderColor: cores.text,
            borderRadius: raio,
            backgroundColor: semHora ? cores.accent : 'transparent',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {semHora ? (
            <Texto variante="kicker" cor={cores.sobreAccent}>
              ✕
            </Texto>
          ) : null}
        </View>
        <Texto variante="corpoMenor">Não sei a hora exata</Texto>
      </Pressable>
      <Campo rotulo="Cidade" value={cidade} onChangeText={setCidade} erro={erros.cidade} autoCapitalize="words" />
      <Campo rotulo="País" value={pais} onChangeText={setPais} autoCapitalize="words" />

      <Botao
        rotulo={carregando ? 'Calculando…' : 'Calcular cruzamento'}
        expandir
        desabilitado={carregando || desabilitado}
        onPress={() => void calcular()}
      />
    </View>
  );
}
