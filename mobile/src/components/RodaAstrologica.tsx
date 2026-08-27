import { View } from 'react-native';
import Svg, { Circle, Line, Polygon } from 'react-native-svg';
import { Texto } from './Texto';
import { cores, layout, regua } from '@/theme';

interface Ponto {
  /** Grau absoluto na eclíptica, 0-360. `null` quando não dá para calcular. */
  grauAbsoluto: number | null;
  /** Aproximado (depende da hora desconhecida) — muda o marcador para oco. */
  aproximado?: boolean;
}

interface Props {
  sol: Ponto;
  lua: Ponto;
  ascendente: Ponto;
  /** Grau dentro do signo do Sol, 0-30 — texto central. */
  grauSolNoSigno: number;
  /** Nome do signo do Sol — texto central, acima do grau. Vem sempre da API. */
  signoSol: string;
}

const TAMANHO = layout.roda;
const CENTRO = TAMANHO / 2;
const R_EXTERNO = 150;
const R_MEIO = 110;
const R_INTERNO = 62;
const TAMANHO_MARCACAO = 9;

/**
 * Converte grau absoluto (0-360, 0 = início de Áries) em ponto cartesiano.
 * 0° fica no topo; o ângulo cresce em sentido horário — convenção simples e
 * consistente, não a orientação astrológica tradicional (Asc à esquerda),
 * porque o design system não especifica uma. Ver resumo final da tarefa.
 */
function paraXY(grauAbsoluto: number, raio: number) {
  const rad = ((grauAbsoluto - 90) * Math.PI) / 180;
  return {
    x: CENTRO + raio * Math.cos(rad),
    y: CENTRO + raio * Math.sin(rad),
  };
}

/**
 * Roda astrológica em SVG 330x330: três círculos concêntricos (2px, 2px, 1px),
 * 12 marcações de 30°, triângulo vermelho ligando Sol/Lua/Ascendente — desenhada
 * a partir de `grau_absoluto` de verdade, nunca de coordenadas fixas.
 * O grau central (900/26px) e o signo do Sol ficam sobrepostos no meio.
 */
export function RodaAstrologica({ sol, lua, ascendente, grauSolNoSigno, signoSol }: Props) {
  const marcacoes = Array.from({ length: 12 }, (_, i) => i * 30);

  const pontos = [
    { ...sol, raio: R_MEIO },
    { ...lua, raio: R_MEIO },
    { ...ascendente, raio: R_MEIO },
  ].filter((p): p is Ponto & { raio: number } => p.grauAbsoluto !== null);

  const verticesTriangulo = pontos
    .map((p) => paraXY(p.grauAbsoluto as number, p.raio))
    .map((p) => `${p.x},${p.y}`)
    .join(' ');

  return (
    <View
      style={{
        width: TAMANHO,
        height: TAMANHO,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Svg width={TAMANHO} height={TAMANHO} viewBox={`0 0 ${TAMANHO} ${TAMANHO}`}>
        <Circle
          cx={CENTRO}
          cy={CENTRO}
          r={R_EXTERNO}
          stroke={cores.text}
          strokeWidth={regua.forte}
          fill="none"
        />
        <Circle
          cx={CENTRO}
          cy={CENTRO}
          r={R_MEIO}
          stroke={cores.text}
          strokeWidth={regua.forte}
          fill="none"
        />
        <Circle
          cx={CENTRO}
          cy={CENTRO}
          r={R_INTERNO}
          stroke={cores.text}
          strokeWidth={regua.fina}
          fill="none"
        />

        {/* 12 marcações de 30°, para fora do círculo externo. */}
        {marcacoes.map((grau) => {
          const a = paraXY(grau, R_EXTERNO);
          const b = paraXY(grau, R_EXTERNO + TAMANHO_MARCACAO);
          return (
            <Line
              key={grau}
              x1={a.x}
              y1={a.y}
              x2={b.x}
              y2={b.y}
              stroke={cores.text}
              strokeWidth={regua.forte}
            />
          );
        })}

        {/* Triângulo vermelho Sol/Lua/Ascendente — só desenha com pontos reais. */}
        {verticesTriangulo.length > 0 && pontos.length === 3 ? (
          <Polygon
            points={verticesTriangulo}
            stroke={cores.accent}
            strokeWidth={regua.forte}
            fill="none"
          />
        ) : null}

        {/* Marcador de cada vértice: oco quando aproximado (hora desconhecida). */}
        {pontos.map((p, i) => {
          const xy = paraXY(p.grauAbsoluto as number, p.raio);
          return (
            <Circle
              key={i}
              cx={xy.x}
              cy={xy.y}
              r={5}
              fill={p.aproximado ? cores.bg : cores.accent}
              stroke={cores.accent}
              strokeWidth={regua.forte}
            />
          );
        })}
      </Svg>

      {/* Grau central sobreposto, fora do SVG: Archivo não renderiza bem em <SvgText>. */}
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Texto variante="kicker">{signoSol}</Texto>
        <Texto variante="tituloCompacto" style={{ marginTop: 2 }}>
          {`${Math.round(grauSolNoSigno)}°`}
        </Texto>
      </View>
    </View>
  );
}
