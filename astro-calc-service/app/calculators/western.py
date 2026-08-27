"""
Mapa astrológico ocidental: Sol, Lua, Ascendente, Meio-céu, os 10 planetas,
as 12 casas (sistema Placidus) e aspectos maiores.

Por que não `pyswisseph`: a lib exige compilar uma extensão C
(`swisseph`), e o ambiente onde este serviço foi construído não tem
Microsoft C++ Build Tools disponível (nem há wheel pré-compilado no PyPI
para Windows/Python 3.12 no momento). `flatlib` tem a mesma dependência por
baixo, então cai no mesmo problema. A alternativa escolhida foi
`pymeeus`, que implementa os algoritmos astronômicos clássicos de Jean
Meeus ("Astronomical Algorithms") em Python puro — VSOP87 para os
planetas, ELP2000-82 para a Lua — sem exigir compilador nem download de
arquivos de efemérides externos. Ver README.md para a validação feita
(posições cruzadas contra os exemplos do próprio livro/doctests do
pymeeus e contra fatos de referência conhecidos).

Precisão: suficiente para astrologia (posições geocêntricas aparentes
tipicamente na casa de segundos de arco de diferença em relação à Swiss
Ephemeris) — muito acima da resolução que qualquer orbe de aspecto (6-8°)
ou leitura de signo/casa precisa.

Sistema de casas: Placidus, calculado pela definição clássica (divisão do
arco diurno/noturno de cada cúspide em frações de tempo iguais),
resolvida por iteração de ponto fixo — não pela tabela de Swiss Ephemeris.
Em latitudes muito altas (>66°, círculo polar) o sistema Placidus não tem
solução matemática para algumas cúspides; esse caso extremo não é tratado
aqui (limitação conhecida, documentada no README).
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date, datetime, time, timedelta, timezone as dt_timezone
from math import atan2, asin, tan, sin, cos, radians, degrees, isfinite
from zoneinfo import ZoneInfo

from pymeeus.Epoch import Epoch
from pymeeus.Earth import Earth
from pymeeus.Sun import Sun
from pymeeus.Moon import Moon
from pymeeus.Mercury import Mercury
from pymeeus.Venus import Venus
from pymeeus.Mars import Mars
from pymeeus.Jupiter import Jupiter
from pymeeus.Saturn import Saturn
from pymeeus.Uranus import Uranus
from pymeeus.Neptune import Neptune
from pymeeus.Pluto import Pluto
import pymeeus.Coordinates as coord

SIGNOS = [
    "Áries", "Touro", "Gêmeos", "Câncer", "Leão", "Virgem",
    "Libra", "Escorpião", "Sagitário", "Capricórnio", "Aquário", "Peixes",
]

# Classes VSOP87 heliocêntricas do pymeeus, por chave de planeta do contrato.
_CLASSE_HELIOCENTRICA = {
    "mercurio": Mercury,
    "venus": Venus,
    "marte": Mars,
    "jupiter": Jupiter,
    "saturno": Saturn,
    "urano": Uranus,
    "netuno": Neptune,
    "plutao": Pluto,
}

CHAVES_PLANETAS = [
    "sol", "lua", "mercurio", "venus", "marte",
    "jupiter", "saturno", "urano", "netuno", "plutao",
]

# Orbe (em graus) e ângulo exato de cada aspecto maior considerado.
_ASPECTOS_MAIORES = [
    ("conjuncao", 0.0, 8.0),
    ("sextil", 60.0, 6.0),
    ("quadratura", 90.0, 7.0),
    ("trigono", 120.0, 8.0),
    ("oposicao", 180.0, 8.0),
]

_LUZ_TEMPO_DIAS_POR_UA = 0.0057755183  # (1 UA) / (c em dias)


def _normalizar_graus(x: float) -> float:
    # pymeeus devolve objetos `Angle` em várias funções; convertemos para
    # float sempre aqui para não deixar `Angle` vazar para o resto do
    # código (onde operadores como `//` não estão sobrecarregados nele).
    x = float(x) % 360.0
    return x + 360.0 if x < 0 else x


def _diferenca_angular(a: float, b: float) -> float:
    """Menor diferença angular entre dois ângulos, em [0, 180]."""
    d = abs(a - b) % 360.0
    return 360.0 - d if d > 180.0 else d


def signo_de_grau_absoluto(grau_absoluto: float) -> tuple[str, float]:
    grau_absoluto = _normalizar_graus(grau_absoluto)
    indice_signo = int(grau_absoluto // 30) % 12
    grau_no_signo = grau_absoluto - indice_signo * 30
    return SIGNOS[indice_signo], grau_no_signo


def _epoch_utc(dt_utc: datetime) -> Epoch:
    fracao_dia = (
        dt_utc.hour / 24
        + dt_utc.minute / 1440
        + (dt_utc.second + dt_utc.microsecond / 1e6) / 86400
    )
    # Diferença TT-UT (ΔT) é de segundos a pouco mais de um minuto no
    # intervalo 1900-2035; ignorada aqui de propósito — o erro de posição
    # que isso introduz (frações de segundo de arco para os planetas mais
    # lentos, ~0.01° para a Lua no pior caso) é irrelevante frente aos
    # orbes de aspecto (graus) usados em astrologia.
    return Epoch(dt_utc.year, dt_utc.month, dt_utc.day + fracao_dia)


def _posicao_geocentrica_planeta(classe, epoch: Epoch) -> tuple[float, float, float]:
    """
    Longitude e latitude eclíptica geocêntrica aparente (grau) + distância
    (UA), a partir das posições heliocêntricas VSOP87 do planeta e da
    Terra, com 1 iteração de correção de tempo-luz e nutação em longitude
    aplicada (posição referida ao equinócio verdadeiro da data — o mesmo
    referencial que softwares de astrologia usam por padrão).
    """
    l0, b0, r0 = Earth.geometric_heliocentric_position(epoch)
    l0, b0 = float(l0), float(b0)

    l, b, r = classe.geometric_heliocentric_position(epoch)
    l, b = float(l), float(b)

    x = y = z = 0.0
    tau = 0.0
    for _ in range(3):
        epoch_atrasado = epoch if tau == 0.0 else Epoch(epoch.jde() - tau)
        l, b, r = classe.geometric_heliocentric_position(epoch_atrasado)
        l, b = float(l), float(b)
        x = r * cos(radians(b)) * cos(radians(l)) - r0 * cos(radians(b0)) * cos(radians(l0))
        y = r * cos(radians(b)) * sin(radians(l)) - r0 * cos(radians(b0)) * sin(radians(l0))
        z = r * sin(radians(b)) - r0 * sin(radians(b0))
        delta = (x * x + y * y + z * z) ** 0.5
        tau = _LUZ_TEMPO_DIAS_POR_UA * delta

    longitude = _normalizar_graus(degrees(atan2(y, x)))
    latitude = degrees(atan2(z, (x * x + y * y) ** 0.5))

    dpsi = coord.nutation_longitude(epoch)
    longitude_aparente = _normalizar_graus(longitude + dpsi)

    return longitude_aparente, latitude, (x * x + y * y + z * z) ** 0.5


def _longitude_sol(epoch: Epoch) -> float:
    lon, _lat, _r = Sun.apparent_geocentric_position(epoch)
    return _normalizar_graus(float(lon))


def _longitude_lua(epoch: Epoch) -> float:
    lam, _bet, _dist, _par = Moon.geocentric_ecliptical_pos(epoch)
    dpsi = coord.nutation_longitude(epoch)
    return _normalizar_graus(float(lam) + dpsi)


def _longitude_planeta(chave: str, epoch: Epoch) -> float:
    if chave == "sol":
        return _longitude_sol(epoch)
    if chave == "lua":
        return _longitude_lua(epoch)
    classe = _CLASSE_HELIOCENTRICA[chave]
    lon, _lat, _dist = _posicao_geocentrica_planeta(classe, epoch)
    return lon


def _esta_retrogrado(chave: str, epoch: Epoch) -> bool:
    if chave in ("sol", "lua"):
        # Sol e Lua nunca são considerados retrógrados em astrologia.
        return False
    dt_amostra = 1.0  # dia; suficiente mesmo para Mercúrio (ciclo ~3-4 semanas)
    lon_antes = _longitude_planeta(chave, Epoch(epoch.jde() - dt_amostra / 2))
    lon_depois = _longitude_planeta(chave, Epoch(epoch.jde() + dt_amostra / 2))
    diferenca = lon_depois - lon_antes
    # normaliza para tratar a passagem por 0°/360°
    if diferenca > 180:
        diferenca -= 360
    elif diferenca < -180:
        diferenca += 360
    return diferenca < 0


# ---------------------------------------------------------------------------
# Casas (Placidus) e ângulos
# ---------------------------------------------------------------------------


def _ramc_graus(epoch: Epoch, longitude_leste: float) -> float:
    """Right Ascension of the Midheaven (= tempo sidéreo local), em graus."""
    obliquidade_verdadeira = coord.true_obliquity(epoch)
    dpsi = coord.nutation_longitude(epoch)
    tst_dias = epoch.apparent_sidereal_time(obliquidade_verdadeira, dpsi)
    gst_graus = _normalizar_graus(tst_dias * 360.0)
    return _normalizar_graus(gst_graus + longitude_leste)


def _ra_para_longitude_eclip(ra_graus: float, obliquidade_graus: float) -> float:
    """Longitude eclíptica (β=0) cuja ascensão reta é `ra_graus`."""
    ra = radians(ra_graus)
    eps = radians(obliquidade_graus)
    return _normalizar_graus(degrees(atan2(sin(ra), cos(ra) * cos(eps))))


def _meio_ceu(ramc: float, obliquidade: float) -> float:
    return _ra_para_longitude_eclip(ramc, obliquidade)


def _ascendente(ramc: float, latitude: float, obliquidade: float) -> float:
    """
    Ascendente: interseção do plano da eclíptica com o plano do horizonte
    local, do lado nascente (leste).

    Calculado por geometria vetorial (produto vetorial dos dois planos, via
    seus vetores normais) em vez da fórmula trigonométrica direta de
    "tan(Asc)", porque essa fórmula fechada tem uma ambiguidade de
    quadrante fácil de resolver errado (dá o Descendente em vez do
    Ascendente dependendo de como o atan2 é montado). O método vetorial
    evita esse risco: calcula as duas interseções (antípodas) e escolhe a
    que está do lado nascente pelo ângulo horário.
    """
    ramc_r = radians(ramc)
    lat_r = radians(latitude)
    eps_r = radians(obliquidade)

    # Normal do plano da eclíptica, no referencial equatorial.
    n_ecl = (0.0, -sin(eps_r), cos(eps_r))
    # Direção do zênite local (normal do plano do horizonte).
    zenite = (cos(lat_r) * cos(ramc_r), cos(lat_r) * sin(ramc_r), sin(lat_r))

    # Produto vetorial: direção da reta de interseção dos dois planos.
    cx = n_ecl[1] * zenite[2] - n_ecl[2] * zenite[1]
    cy = n_ecl[2] * zenite[0] - n_ecl[0] * zenite[2]
    cz = n_ecl[0] * zenite[1] - n_ecl[1] * zenite[0]

    candidatos = []
    for sinal in (1.0, -1.0):
        x, y, z = sinal * cx, sinal * cy, sinal * cz
        ra = atan2(y, x)
        dec = atan2(z, (x * x + y * y) ** 0.5)
        h = ramc_r - ra
        pi = 3.141592653589793
        h_normalizado = (h + pi) % (2 * pi) - pi
        longitude = _ra_dec_para_longitude_eclip(ra, dec, eps_r)
        candidatos.append((h_normalizado, longitude))

    # Lado nascente (Ascendente): o ponto ainda não culminou, ângulo
    # horário negativo. Das duas interseções antípodas, é sempre essa.
    for h_normalizado, longitude in candidatos:
        if h_normalizado < 0:
            return _normalizar_graus(degrees(longitude))

    # Não deveria acontecer (uma das duas sempre tem H<0), mas por
    # segurança devolve a de menor |H| normalizado.
    _, longitude = min(candidatos, key=lambda c: abs(c[0]))
    return _normalizar_graus(degrees(longitude))


def _ra_dec_para_longitude_eclip(ra_rad: float, dec_rad: float, eps_rad: float) -> float:
    """Longitude eclíptica (radianos) de um ponto dado por RA/Dec (radianos)."""
    return atan2(sin(ra_rad) * cos(eps_rad) + tan(dec_rad) * sin(eps_rad), cos(ra_rad))


def _declinacao_de_longitude(longitude_graus: float, obliquidade_graus: float) -> float:
    lam = radians(longitude_graus)
    eps = radians(obliquidade_graus)
    return degrees(asin(sin(eps) * sin(lam)))


def _cuspide_placidus_iterativa(
    ramc: float,
    latitude: float,
    obliquidade: float,
    fracao: float,
    hemisferio_superior: bool,
    chute_inicial_ra: float,
) -> float:
    """
    Cúspide intermediária (11, 12, 2 ou 3) pela definição clássica de
    Placidus: divide o arco semi-diurno (casas 10-11-12-1) ou semi-noturno
    (casas 1-2-3-4) do PRÓPRIO ponto em frações de tempo iguais.
    Resolvido por iteração de ponto fixo em ascensão reta.
    """
    ra = chute_inicial_ra
    for _ in range(30):
        longitude = _ra_para_longitude_eclip(ra, obliquidade)
        declinacao = _declinacao_de_longitude(longitude, obliquidade)

        tan_lat = tan(radians(latitude))
        tan_dec = tan(radians(declinacao))
        produto = max(-1.0, min(1.0, tan_lat * tan_dec))
        ad = degrees(asin(produto))  # diferença ascensional

        if hemisferio_superior:
            ra_novo = _normalizar_graus(ramc + fracao * (90.0 + ad))
        else:
            ra_novo = _normalizar_graus(ramc + 90.0 + fracao * (90.0 - ad))

        if abs(_diferenca_angular(ra_novo, ra)) < 1e-8:
            ra = ra_novo
            break
        ra = ra_novo

    return _ra_para_longitude_eclip(ra, obliquidade)


@dataclass
class Angulos:
    ascendente: float
    meio_ceu: float
    casas: list[float]  # 12 cúspides, longitude eclíptica, casa 1..12


def calcular_casas_placidus(ramc: float, latitude: float, obliquidade: float) -> Angulos:
    asc = _ascendente(ramc, latitude, obliquidade)
    mc = _meio_ceu(ramc, obliquidade)

    cusp_11 = _cuspide_placidus_iterativa(
        ramc, latitude, obliquidade, fracao=1 / 3, hemisferio_superior=True,
        chute_inicial_ra=_normalizar_graus(ramc + 30.0),
    )
    cusp_12 = _cuspide_placidus_iterativa(
        ramc, latitude, obliquidade, fracao=2 / 3, hemisferio_superior=True,
        chute_inicial_ra=_normalizar_graus(ramc + 60.0),
    )
    cusp_2 = _cuspide_placidus_iterativa(
        ramc, latitude, obliquidade, fracao=1 / 3, hemisferio_superior=False,
        chute_inicial_ra=_normalizar_graus(ramc + 120.0),
    )
    cusp_3 = _cuspide_placidus_iterativa(
        ramc, latitude, obliquidade, fracao=2 / 3, hemisferio_superior=False,
        chute_inicial_ra=_normalizar_graus(ramc + 150.0),
    )

    casas = [0.0] * 12
    casas[0] = asc          # casa 1
    casas[10] = cusp_11     # casa 11
    casas[11] = cusp_12     # casa 12
    casas[9] = mc           # casa 10
    casas[1] = cusp_2       # casa 2
    casas[2] = cusp_3       # casa 3
    casas[3] = _normalizar_graus(mc + 180.0)      # casa 4 (IC)
    casas[4] = _normalizar_graus(cusp_11 + 180.0)  # casa 5
    casas[5] = _normalizar_graus(cusp_12 + 180.0)  # casa 6
    casas[6] = _normalizar_graus(asc + 180.0)      # casa 7 (DC)
    casas[7] = _normalizar_graus(cusp_2 + 180.0)   # casa 8
    casas[8] = _normalizar_graus(cusp_3 + 180.0)   # casa 9

    return Angulos(ascendente=asc, meio_ceu=mc, casas=casas)


def _casa_do_grau(grau_absoluto: float, cuspides: list[float]) -> int:
    """Em qual casa (1-12) cai um ponto do zodíaco, dadas as 12 cúspides."""
    grau_absoluto = _normalizar_graus(grau_absoluto)
    for i in range(12):
        inicio = cuspides[i]
        fim = cuspides[(i + 1) % 12]
        if inicio <= fim:
            dentro = inicio <= grau_absoluto < fim
        else:
            dentro = grau_absoluto >= inicio or grau_absoluto < fim
        if dentro:
            return i + 1
    return 12  # fallback (não deveria ocorrer com cúspides bem formadas)


# ---------------------------------------------------------------------------
# Resultado
# ---------------------------------------------------------------------------


@dataclass
class ResultadoPlaneta:
    chave: str
    signo: str
    grau: float
    grau_absoluto: float
    retrogrado: bool
    casa: int


@dataclass
class ResultadoMapa:
    sol: ResultadoPlaneta
    lua: ResultadoPlaneta
    ascendente: dict
    meio_ceu: dict
    planetas: dict[str, ResultadoPlaneta]
    casas: list[dict]
    aspectos: list[dict]
    data_hora_utc_usada: str
    hora_confiavel: bool


def _resolver_datetime_utc(
    data_nascimento: date, hora_nascimento: time, hora_desconhecida: bool, timezone_iana: str
) -> datetime:
    if hora_desconhecida:
        hora_local = time(12, 0)
    else:
        hora_local = hora_nascimento

    dt_local_naive = datetime.combine(data_nascimento, hora_local)
    dt_local = dt_local_naive.replace(tzinfo=ZoneInfo(timezone_iana))
    return dt_local.astimezone(dt_timezone.utc)


def calcular_mapa_ocidental(
    data_nascimento: date,
    hora_nascimento: time,
    hora_desconhecida: bool,
    latitude: float,
    longitude: float,
    timezone_iana: str,
) -> ResultadoMapa:
    dt_utc = _resolver_datetime_utc(data_nascimento, hora_nascimento, hora_desconhecida, timezone_iana)
    epoch = _epoch_utc(dt_utc)

    obliquidade = coord.true_obliquity(epoch)
    ramc = _ramc_graus(epoch, longitude)
    angulos = calcular_casas_placidus(ramc, latitude, obliquidade)

    longitudes: dict[str, float] = {
        chave: _longitude_planeta(chave, epoch) for chave in CHAVES_PLANETAS
    }
    retrogrados: dict[str, bool] = {
        chave: _esta_retrogrado(chave, epoch) for chave in CHAVES_PLANETAS
    }

    planetas: dict[str, ResultadoPlaneta] = {}
    for chave in CHAVES_PLANETAS:
        grau_abs = longitudes[chave]
        signo, grau = signo_de_grau_absoluto(grau_abs)
        casa = _casa_do_grau(grau_abs, angulos.casas)
        planetas[chave] = ResultadoPlaneta(
            chave=chave,
            signo=signo,
            grau=round(grau, 2),
            grau_absoluto=round(grau_abs, 2),
            retrogrado=retrogrados[chave],
            casa=casa,
        )

    signo_asc, grau_asc = signo_de_grau_absoluto(angulos.ascendente)
    signo_mc, grau_mc = signo_de_grau_absoluto(angulos.meio_ceu)

    casas_resposta = []
    for i, cusp_grau in enumerate(angulos.casas, start=1):
        signo_casa, grau_casa = signo_de_grau_absoluto(cusp_grau)
        casas_resposta.append({"signo": signo_casa, "grau": round(grau_casa, 2), "casa": i})

    aspectos = _calcular_aspectos(longitudes)

    return ResultadoMapa(
        sol=planetas["sol"],
        lua=planetas["lua"],
        ascendente={"signo": signo_asc, "grau": round(grau_asc, 2)},
        meio_ceu={"signo": signo_mc, "grau": round(grau_mc, 2)},
        planetas=planetas,
        casas=casas_resposta,
        aspectos=aspectos,
        data_hora_utc_usada=dt_utc.isoformat(),
        hora_confiavel=not hora_desconhecida,
    )


def _calcular_aspectos(longitudes: dict[str, float]) -> list[dict]:
    chaves = list(longitudes.keys())
    aspectos = []
    for i in range(len(chaves)):
        for j in range(i + 1, len(chaves)):
            p1, p2 = chaves[i], chaves[j]
            diff = _diferenca_angular(longitudes[p1], longitudes[p2])
            for tipo, angulo_exato, orbe in _ASPECTOS_MAIORES:
                delta = abs(diff - angulo_exato)
                if delta <= orbe:
                    aspectos.append(
                        {
                            "planeta_1": p1,
                            "planeta_2": p2,
                            "tipo": tipo,
                            "diferenca_graus": round(diff, 2),
                        }
                    )
                    break  # só o aspecto mais próximo por par
    return aspectos
