import { View } from 'react-native';
import { FaixaAvisoHora, RodaAstrologica, Tela, Texto } from '@/components';
import { usePerfil } from '@/state/PerfilContext';
import { PLANETAS, PONTOS, dependeDaHora } from '@/data/planetas';
import { grauAbsoluto } from '@/data/correspondencias';
import { cores, espaco, layout, regua } from '@/theme';
import type { ChavePlaneta } from '@shared/types/astro';

/**
 * Mapa: kicker de nascimento, faixa de aviso (se hora desconhecida), roda em
 * SVG desenhada a partir de `grau_absoluto` real e a lista "O que está onde".
 *
 * A interpretação em linguagem simples por posição (1 frase por item, Claude
 * API) ainda não tem rota própria no backend — ver `api/client.ts`, comentário
 * de `interpretacaoSignos`. Por isso a lista mostra só o dado calculado
 * (nunca inventado) e um aviso honesto no lugar do texto.
 */
export default function Mapa() {
  const { perfil, leituras, horaDuvidosa } = usePerfil();
  const mapa = leituras.ocidental;

  const kicker = mapa
    ? [perfil?.cidade, mapa.localizacao_usada.timezone_iana, mapa.metadata.sistema_casas]
        .filter(Boolean)
        .join(' · ')
    : 'Sem mapa calculado';

  const ascAbs = mapa
    ? (mapa.ascendente.grau_absoluto ??
      grauAbsoluto(mapa.ascendente.signo, mapa.ascendente.grau))
    : null;
  const solAbs = mapa
    ? (mapa.sol.grau_absoluto ?? grauAbsoluto(mapa.sol.signo, mapa.sol.grau))
    : null;
  const luaAbs = mapa
    ? (mapa.lua.grau_absoluto ?? grauAbsoluto(mapa.lua.signo, mapa.lua.grau))
    : null;

  return (
    <Tela semPaddingHorizontal>
      <View style={{ paddingHorizontal: layout.padding }}>
        <Texto variante="kicker">{kicker}</Texto>
        <Texto variante="tituloTela" style={{ marginTop: espaco.sm }}>
          Seu mapa
        </Texto>
      </View>

      <View style={{ marginTop: espaco.lg }}>
        <FaixaAvisoHora visivel={horaDuvidosa} />
      </View>

      <View style={{ alignItems: 'center', marginTop: espaco.xl }}>
        {mapa ? (
          <RodaAstrologica
            sol={{ grauAbsoluto: solAbs }}
            lua={{ grauAbsoluto: luaAbs }}
            ascendente={{ grauAbsoluto: ascAbs, aproximado: !mapa.hora_confiavel }}
            grauSolNoSigno={mapa.sol.grau}
            signoSol={mapa.sol.signo}
          />
        ) : (
          <View
            style={{
              width: layout.roda,
              height: layout.roda,
              maxWidth: '100%',
              borderWidth: regua.forte,
              borderColor: cores.divider,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Texto variante="corpoSecundario">Ainda não calculamos seu mapa.</Texto>
          </View>
        )}
      </View>

      <View style={{ paddingHorizontal: layout.padding, marginTop: espaco.xxl }}>
        <Texto variante="kicker">O que está onde</Texto>

        {mapa ? (
          <>
            {(Object.keys(mapa.planetas) as ChavePlaneta[]).map((chave) => {
              const posicao = mapa.planetas[chave];
              const meta = PLANETAS[chave];
              if (!posicao || !meta) return null;

              return (
                <ItemPosicao
                  key={chave}
                  glifo={meta.glifo}
                  titulo={`${meta.rotulo} em ${posicao.signo}`}
                  nota={posicao.casa ? `Casa ${posicao.casa}` : undefined}
                  aproximado={!mapa.hora_confiavel && dependeDaHora(chave)}
                />
              );
            })}

            <ItemPosicao
              glifo={PONTOS.ascendente.glifo}
              titulo={`Ascendente em ${mapa.ascendente.signo}`}
              aproximado={!mapa.hora_confiavel && dependeDaHora('ascendente')}
            />
            <ItemPosicao
              glifo={PONTOS.meio_ceu.glifo}
              titulo={`Meio-céu em ${mapa.meio_ceu.signo}`}
              aproximado={!mapa.hora_confiavel && dependeDaHora('meio_ceu')}
            />

            <Texto variante="corpoSecundario" style={{ marginTop: espaco.lg }}>
              Uma leitura em linguagem simples para cada posição chega em breve.
            </Texto>
          </>
        ) : (
          <Texto variante="corpoSecundario" style={{ marginTop: espaco.md }}>
            Ainda não calculamos seu mapa.
          </Texto>
        )}
      </View>
    </Tela>
  );
}

function ItemPosicao({
  glifo,
  titulo,
  nota,
  aproximado,
}: {
  glifo: string;
  titulo: string;
  nota?: string;
  aproximado: boolean;
}) {
  return (
    <View
      style={{
        flexDirection: 'row',
        paddingVertical: espaco.lg,
        borderBottomWidth: regua.leve,
        borderBottomColor: cores.divider,
        minHeight: layout.alvoMinimo,
      }}
    >
      <View style={{ width: layout.colunaGlifoMapa }}>
        <Texto variante="tituloItem" cor={cores.accent}>
          {glifo}
        </Texto>
      </View>
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: espaco.sm }}>
          <Texto variante="tituloItem">{titulo}</Texto>
          {aproximado ? (
            <View
              style={{
                borderWidth: regua.forte,
                borderColor: cores.accent,
                paddingHorizontal: espaco.xs,
                paddingVertical: 2,
              }}
            >
              <Texto variante="kicker" cor={cores.accent}>
                Aproximado
              </Texto>
            </View>
          ) : null}
        </View>
        {nota ? (
          <Texto variante="corpoSecundario" style={{ marginTop: espaco.xs }}>
            {nota}
          </Texto>
        ) : null}
      </View>
    </View>
  );
}
