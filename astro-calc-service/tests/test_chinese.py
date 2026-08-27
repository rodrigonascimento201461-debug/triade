"""
Testes do calculador de signo chinês — foco no corte de Ano Novo Chinês
(o bug histórico do projeto: tabela incompleta e comparação de data
errada). Casos verificados contra fatos de calendário chinês de
conhecimento público (independentes da tabela `ANO_NOVO_CHINES` do próprio
módulo, exceto onde indicado).
"""

from datetime import date

import pytest

from app.calculators.chinese import (
    ANO_MAX,
    ANO_MIN,
    AnoForaDaTabelaError,
    calcular_signo_chines,
)


def test_corte_1962_e_tigre_nao_boi():
    """
    O caso citado explicitamente no CLAUDE.md: quem nasce em 05/02/1962
    (a própria data do Ano Novo Chinês daquele ano) já é do ano novo —
    Tigre — não do ano anterior (Boi). Pega o bug clássico de comparação
    de data (< vs <=) no corte.
    """
    r = calcular_signo_chines(date(1962, 2, 5))
    assert r.animal == "Tigre"
    assert r.ano_efetivo_calculo == 1962


def test_dia_antes_do_corte_1962_e_boi():
    """Um dia antes do Ano Novo Chinês de 1962: ainda é o ciclo de 1961 (Boi)."""
    r = calcular_signo_chines(date(1962, 2, 4))
    assert r.animal == "Boi"
    assert r.ano_efetivo_calculo == 1961


def test_exemplo_do_contrato_1990_05_15_cavalo_de_metal():
    """
    Exemplo usado na PARTE 2 do CLAUDE.md: animal Cavalo, elemento Metal,
    ano efetivo 1990. Também confere o exemplo de tronco/ramo do design
    ("Tronco Geng, Ramo Wu").
    """
    r = calcular_signo_chines(date(1990, 5, 15))
    assert r.animal == "Cavalo"
    assert r.elemento == "Metal"
    assert r.ano_efetivo_calculo == 1990
    assert r.tronco_celeste == "Geng"
    assert r.ramo_terrestre == "Wu"


def test_ano_novo_1900_e_rato_gengzi():
    """
    1900 é o famoso ano "Gengzi" (Rato de Metal Yang) — início do século
    lunissolar mais citado em referências públicas. Ano Novo Chinês de
    1900 = 31/01/1900.
    """
    r = calcular_signo_chines(date(1900, 1, 31))  # no próprio dia do corte
    assert r.animal == "Rato"
    assert r.ano_efetivo_calculo == 1900
    assert r.tronco_celeste == "Geng"
    assert r.ramo_terrestre == "Zi"

    # Um dia antes do corte de 1900: o ano efetivo seria 1899, fora da
    # tabela suportada (1900-2035) — comportamento correto de borda, não
    # bug: o serviço não promete cobertura para esse caso extremo.
    with pytest.raises(AnoForaDaTabelaError):
        calcular_signo_chines(date(1900, 1, 30))


def test_corte_2000_coelho_antes_rato_depois():
    """
    Ano Novo Chinês de 2000 = 05/02/2000. Antes disso ainda é o ciclo de
    1999 (Coelho); no próprio dia e depois, ano de 2000 (Dragão).
    """
    antes = calcular_signo_chines(date(2000, 2, 4))
    assert antes.animal == "Coelho"
    assert antes.ano_efetivo_calculo == 1999

    depois = calcular_signo_chines(date(2000, 2, 5))
    assert depois.animal == "Dragão"
    assert depois.ano_efetivo_calculo == 2000


def test_corte_2023_tigre_antes_coelho_depois():
    """Ano Novo Chinês de 2023 = 22/01/2023 (fato de conhecimento público)."""
    antes = calcular_signo_chines(date(2023, 1, 21))
    assert antes.animal == "Tigre"
    assert antes.ano_efetivo_calculo == 2022

    depois = calcular_signo_chines(date(2023, 1, 22))
    assert depois.animal == "Coelho"
    assert depois.ano_efetivo_calculo == 2023


def test_extremo_superior_da_tabela_2035():
    """2035 está dentro da tabela (limite superior do range pedido)."""
    r = calcular_signo_chines(date(2035, 6, 1))
    assert r.ano_efetivo_calculo == 2035


def test_ano_fora_da_tabela_leva_erro():
    with pytest.raises(AnoForaDaTabelaError):
        calcular_signo_chines(date(ANO_MIN - 1, 6, 1))
    with pytest.raises(AnoForaDaTabelaError):
        calcular_signo_chines(date(ANO_MAX + 1, 6, 1))


def test_yin_yang_alterna_a_cada_ano():
    r1 = calcular_signo_chines(date(1984, 6, 1))
    r2 = calcular_signo_chines(date(1985, 6, 1))
    assert r1.yin_yang == "Yang"
    assert r2.yin_yang == "Yin"
    assert r1.animal == "Rato"
    assert r2.animal == "Boi"
    assert r1.elemento == "Madeira"
    assert r2.elemento == "Madeira"
