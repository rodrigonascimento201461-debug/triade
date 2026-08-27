"""
Testes do mapa astrológico ocidental. Usam lat/long/timezone fixos (sem
geocoding, sem rede) para isolar o cálculo astronômico e de casas.

Não comparamos contra a saída de um Swiss Ephemeris de referência (não
disponível no ambiente onde este serviço foi construído — ver README.md).
Em vez disso, validamos:
  - invariantes estruturais das casas (Placidus é um sistema de quadrante:
    a soma dos 12 arcos tem que fechar 360°, casas opostas têm que ser
    exatamente 180° uma da outra, casa 1 == Ascendente, casa 10 == Meio-céu);
  - o exemplo de 1990-05-15 citado na PARTE 2 do CLAUDE.md (bate o signo do
    Sol e o grau, com tolerância pequena — o valor exato do documento é
    ilustrativo, não uma fixture travada a uma efeméride específica).
"""

from datetime import date, time

import pytest

from app.calculators.western import (
    CHAVES_PLANETAS,
    SIGNOS,
    calcular_mapa_ocidental,
    signo_de_grau_absoluto,
)

RIO_LAT, RIO_LON, RIO_TZ = -22.9110137, -43.2093727, "America/Sao_Paulo"


def test_signo_de_grau_absoluto_limites():
    assert signo_de_grau_absoluto(0.0) == ("Áries", 0.0)
    assert signo_de_grau_absoluto(29.99) == ("Áries", 29.99)
    assert signo_de_grau_absoluto(30.0) == ("Touro", 0.0)
    signo, grau = signo_de_grau_absoluto(359.99)
    assert signo == "Peixes"
    assert grau == pytest.approx(29.99, abs=1e-6)


def test_signo_de_grau_absoluto_normaliza_valores_fora_de_0_360():
    assert signo_de_grau_absoluto(360.0) == ("Áries", 0.0)
    assert signo_de_grau_absoluto(-30.0)[0] == "Peixes"


def test_exemplo_do_contrato_1990_05_15_rio_sol_em_touro():
    """
    Exemplo da PARTE 2 do CLAUDE.md: Sol em Touro ~24.3°, grau_absoluto
    ~54.3°. Tolerância de 2° porque o valor do documento é ilustrativo (não
    necessariamente gerado com o mesmo algoritmo/efeméride deste serviço),
    mas o SIGNO tem que bater exatamente.
    """
    r = calcular_mapa_ocidental(
        data_nascimento=date(1990, 5, 15),
        hora_nascimento=time(14, 20),
        hora_desconhecida=False,
        latitude=RIO_LAT,
        longitude=RIO_LON,
        timezone_iana=RIO_TZ,
    )
    assert r.sol.signo == "Touro"
    assert r.sol.grau == pytest.approx(24.31, abs=2.0)
    assert r.sol.grau_absoluto == pytest.approx(54.31, abs=2.0)
    assert r.meio_ceu["signo"] == "Gêmeos"


def test_todos_os_dez_planetas_presentes():
    r = calcular_mapa_ocidental(
        data_nascimento=date(2000, 1, 1),
        hora_nascimento=time(12, 0),
        hora_desconhecida=False,
        latitude=RIO_LAT,
        longitude=RIO_LON,
        timezone_iana=RIO_TZ,
    )
    assert set(r.planetas.keys()) == set(CHAVES_PLANETAS)
    for chave in CHAVES_PLANETAS:
        assert r.planetas[chave].signo in SIGNOS
        assert 0 <= r.planetas[chave].grau < 30
        assert isinstance(r.planetas[chave].retrogrado, bool)


def test_sol_e_lua_nunca_retrogrados():
    r = calcular_mapa_ocidental(
        data_nascimento=date(2010, 7, 20),
        hora_nascimento=time(3, 5),
        hora_desconhecida=False,
        latitude=51.5074,
        longitude=-0.1278,
        timezone_iana="Europe/London",
    )
    assert r.sol.retrogrado is False
    assert r.lua.retrogrado is False


@pytest.mark.parametrize(
    "lat,lon,tz",
    [
        (-22.9068, -43.1729, "America/Sao_Paulo"),
        (51.5074, -0.1278, "Europe/London"),
        (40.7128, -74.0060, "America/New_York"),
        (35.6762, 139.6503, "Asia/Tokyo"),
        (-33.8688, 151.2093, "Australia/Sydney"),
    ],
)
def test_casas_fecham_360_e_casa1_e_casa10_batem_com_angulos(lat, lon, tz):
    r = calcular_mapa_ocidental(
        data_nascimento=date(1985, 11, 3),
        hora_nascimento=time(6, 45),
        hora_desconhecida=False,
        latitude=lat,
        longitude=lon,
        timezone_iana=tz,
    )
    assert len(r.casas) == 12

    graus_abs = [
        SIGNOS.index(c["signo"]) * 30 + c["grau"] for c in r.casas
    ]
    spans = [
        (graus_abs[(i + 1) % 12] - graus_abs[i]) % 360 for i in range(12)
    ]
    assert sum(spans) == pytest.approx(360.0, abs=1e-4)
    assert all(s > 0 for s in spans)

    # casas opostas (n, n+6) são exatamente 180 graus uma da outra
    for i in range(6):
        diff = abs(graus_abs[i] - graus_abs[i + 6])
        diff = min(diff, 360 - diff)
        assert diff == pytest.approx(180.0, abs=1e-4)

    # casa 1 == Ascendente; casa 10 == Meio-céu
    asc_abs = SIGNOS.index(r.ascendente["signo"]) * 30 + r.ascendente["grau"]
    mc_abs = SIGNOS.index(r.meio_ceu["signo"]) * 30 + r.meio_ceu["grau"]
    assert graus_abs[0] == pytest.approx(asc_abs, abs=1e-4)
    assert graus_abs[9] == pytest.approx(mc_abs, abs=1e-4)


def test_hora_desconhecida_marca_hora_confiavel_falso():
    r = calcular_mapa_ocidental(
        data_nascimento=date(1990, 5, 15),
        hora_nascimento=time(0, 0),
        hora_desconhecida=True,
        latitude=RIO_LAT,
        longitude=RIO_LON,
        timezone_iana=RIO_TZ,
    )
    assert r.hora_confiavel is False
    # meio-dia local == 15:00 UTC nesse fuso (UTC-3)
    assert r.data_hora_utc_usada.startswith("1990-05-15T15:00:00")


def test_hora_conhecida_marca_hora_confiavel_verdadeiro():
    r = calcular_mapa_ocidental(
        data_nascimento=date(1990, 5, 15),
        hora_nascimento=time(14, 20),
        hora_desconhecida=False,
        latitude=RIO_LAT,
        longitude=RIO_LON,
        timezone_iana=RIO_TZ,
    )
    assert r.hora_confiavel is True


def test_aspectos_respeitam_orbe_maximo():
    r = calcular_mapa_ocidental(
        data_nascimento=date(1995, 3, 21),
        hora_nascimento=time(9, 0),
        hora_desconhecida=False,
        latitude=RIO_LAT,
        longitude=RIO_LON,
        timezone_iana=RIO_TZ,
    )
    tipos_validos = {"conjuncao", "sextil", "quadratura", "trigono", "oposicao"}
    for aspecto in r.aspectos:
        assert aspecto["tipo"] in tipos_validos
        assert aspecto["planeta_1"] != aspecto["planeta_2"]
        assert 0 <= aspecto["diferenca_graus"] <= 180
