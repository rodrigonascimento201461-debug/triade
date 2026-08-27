from datetime import date, timedelta

import pytest

from app.calculators.egyptian import (
    METODOLOGIA,
    _FAIXAS,
    calcular_sistema_egipcio,
)


def test_exemplo_do_contrato_toth():
    """Exemplo da PARTE 2 do CLAUDE.md: 15/05 cai em Toth, "09/05 a 02/06"."""
    r = calcular_sistema_egipcio(date(2000, 5, 15))
    assert r.divindade == "Toth"
    assert r.periodo == "09/05 a 02/06"


def test_metodologia_e_o_texto_obrigatorio():
    r = calcular_sistema_egipcio(date(2000, 1, 1))
    assert r.metodologia == METODOLOGIA
    assert "não é um sistema astronômico comprovado do egito antigo" in r.metodologia.lower()


def test_bordas_de_cada_faixa_sao_cobertas_sem_lacuna():
    """
    Para todo dia do ano (usando um ano bissexto para incluir 29/02), o
    cálculo tem que devolver uma divindade — sem exceção, sem lacuna.
    """
    d = date(2000, 1, 1)
    fim = date(2000, 12, 31)
    while d <= fim:
        resultado = calcular_sistema_egipcio(d)
        assert resultado.divindade
        d += timedelta(days=1)


def test_doze_divindades_distintas_na_tabela():
    divindades = {faixa[4] for faixa in _FAIXAS}
    assert len(divindades) == 12


def test_faixas_contiguas_sem_sobreposicao():
    """
    Verifica que, ordenando as faixas por data de início, o fim de uma é
    sempre exatamente a véspera do início da seguinte (ciclo fechado).
    """
    faixas_ordenadas = sorted(_FAIXAS, key=lambda f: (f[0], f[1]))
    for i in range(len(faixas_ordenadas)):
        mes_fim, dia_fim = faixas_ordenadas[i][2], faixas_ordenadas[i][3]
        prox = faixas_ordenadas[(i + 1) % len(faixas_ordenadas)]
        mes_ini_prox, dia_ini_prox = prox[0], prox[1]

        fim_data = date(2001, mes_fim, dia_fim) if not (mes_fim == 2 and dia_fim == 29) else date(2000, 2, 29)
        esperado_proximo = fim_data + timedelta(days=1)
        ano_ref = 2001 if not (mes_ini_prox == 1 and dia_ini_prox == 1 and i == len(faixas_ordenadas) - 1) else esperado_proximo.year
        if mes_fim == 12 and dia_fim == 31:
            assert (mes_ini_prox, dia_ini_prox) == (1, 1)
        else:
            assert (esperado_proximo.month, esperado_proximo.day) == (mes_ini_prox, dia_ini_prox)


@pytest.mark.parametrize(
    "data,divindade_esperada",
    [
        (date(2000, 1, 1), "Ísis"),
        (date(2000, 12, 31), "Osíris"),
        (date(2000, 2, 29), "Osíris"),  # ano bissexto
        (date(2001, 2, 28), "Osíris"),  # ano comum
    ],
)
def test_casos_pontuais(data, divindade_esperada):
    r = calcular_sistema_egipcio(data)
    assert r.divindade == divindade_esperada
