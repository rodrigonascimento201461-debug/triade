"""
Cálculo do signo do zodíaco chinês (calendário lunissolar).

O corte de virada de ano NÃO é 1º de janeiro: é a data do Ano Novo Chinês,
que muda todo ano porque o calendário chinês é lunissolar (meses lunares,
ano solar). Quem nasce entre 1º de janeiro e a data do Ano Novo Chinês do
ano civil ainda pertence, astrologicamente, ao ciclo do ano anterior.

A tabela `ANO_NOVO_CHINES` cobre os anos civis 1900-2035 (com uma margem de
um ano de cada lado, usada só internamente para o cálculo do corte nos
extremos da tabela). As datas vêm da biblioteca `lunardate`, que implementa
a mesma tabela de informação lunar 1900-2099 usada por referências públicas
de calendário chinês (a mesma tabela, derivada do projeto `lunar` de
F. Lee/R. Yeung, é reaproveitada por diversas calculadoras de calendário
chinês, incluindo as que replicam os dados do Hong Kong Observatory /
Purple Mountain Observatory). Isso evita erro de transcrição manual: as
datas foram conferidas por amostragem contra fatos de conhecimento público
(ex.: Ano Novo Chinês de 1900 = 31/01/1900 — ano do Rato, "Gengzi"; 1984 =
02/02/1984, início do ciclo sexagenário "Jiazi"; 2023 = 22/01/2023, ano do
Coelho; 2024 = 10/02/2024, ano do Dragão de Madeira — todos batendo com o
calculado aqui).

Ciclo de 12 animais e de 5 elementos (cada elemento cobre 2 anos
consecutivos, Yang depois Yin) são derivados por aritmética modular a
partir da âncora 1984 = Rato de Madeira, Yang — que também é o ano
"Jiǎzǐ" (甲子), o primeiro do ciclo sexagenário de 60 anos (tronco "Jiǎ",
ramo "Zǐ"). Isso permite calcular tronco celeste e ramo terrestre com a
mesma âncora.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date
from functools import lru_cache

from lunardate import LunarDate

ANO_MIN = 1900
ANO_MAX = 2035

ANIMAIS = [
    "Rato", "Boi", "Tigre", "Coelho", "Dragão", "Serpente",
    "Cavalo", "Cabra", "Macaco", "Galo", "Cão", "Porco",
]

ELEMENTOS = ["Madeira", "Fogo", "Terra", "Metal", "Água"]

TRONCOS_CELESTES = [
    "Jia", "Yi", "Bing", "Ding", "Wu", "Ji", "Geng", "Xin", "Ren", "Gui",
]

RAMOS_TERRESTRES = [
    "Zi", "Chou", "Yin", "Mao", "Chen", "Si",
    "Wu", "Wei", "Shen", "You", "Xu", "Hai",
]

# 1984 = Rato de Madeira, Yang; também é o ano "Jiǎzǐ" (tronco[0], ramo[0]),
# início do ciclo sexagenário — âncora única para todos os quatro ciclos.
ANO_ANCORA = 1984

METODOLOGIA = (
    "Calendário lunissolar chinês: o ano do zodíaco muda na data do Ano "
    "Novo Chinês (não em 1º de janeiro), determinada por tabela de datas "
    "reais do calendário lunissolar (1900-2035)."
)


class AnoForaDaTabelaError(ValueError):
    """Levantado quando o ano civil de nascimento está fora de 1900-2035."""


@lru_cache(maxsize=None)
def _data_ano_novo(ano: int) -> date:
    """Data solar (gregoriana) do 1º dia do ano lunar chinês `ano`."""
    return LunarDate(ano, 1, 1).to_solar_date()


def _construir_tabela() -> dict[int, date]:
    # Uma margem de 1 ano de cada lado só para o cálculo de corte nos
    # extremos (ex.: alguém nascido em janeiro de 1900, antes do Ano Novo
    # Chinês daquele ano, precisa comparar contra o ano novo "de 1899" para
    # decidir o efetivo — mesmo que 1899 não seja um ano civil suportado).
    tabela: dict[int, date] = {}
    for ano in range(ANO_MIN - 1, ANO_MAX + 2):
        try:
            tabela[ano] = _data_ano_novo(ano)
        except ValueError:
            # lunardate cobre 1900-2099; o limite inferior (1899) pode não
            # existir. Nesse caso, simplesmente não entra na tabela.
            continue
    return tabela


ANO_NOVO_CHINES: dict[int, date] = _construir_tabela()


@dataclass(frozen=True)
class SignoChinesResultado:
    animal: str
    elemento: str
    yin_yang: str
    ano_efetivo_calculo: int
    tronco_celeste: str
    ramo_terrestre: str
    metodologia: str


def calcular_signo_chines(data_nascimento: date) -> SignoChinesResultado:
    ano_civil = data_nascimento.year

    if ano_civil < ANO_MIN or ano_civil > ANO_MAX:
        raise AnoForaDaTabelaError(
            f"Ano {ano_civil} fora da tabela suportada "
            f"({ANO_MIN}-{ANO_MAX})."
        )

    cny_ano_civil = ANO_NOVO_CHINES.get(ano_civil)
    if cny_ano_civil is None:
        raise AnoForaDaTabelaError(f"Sem data de Ano Novo Chinês para {ano_civil}.")

    if data_nascimento < cny_ano_civil:
        ano_efetivo = ano_civil - 1
    else:
        ano_efetivo = ano_civil

    if ano_efetivo not in ANO_NOVO_CHINES:
        raise AnoForaDaTabelaError(
            f"Ano efetivo {ano_efetivo} fora da tabela suportada."
        )

    diff = ano_efetivo - ANO_ANCORA

    animal = ANIMAIS[diff % 12]
    elemento = ELEMENTOS[(diff // 2) % 5]
    yin_yang = "Yang" if diff % 2 == 0 else "Yin"
    tronco = TRONCOS_CELESTES[diff % 10]
    ramo = RAMOS_TERRESTRES[diff % 12]

    return SignoChinesResultado(
        animal=animal,
        elemento=elemento,
        yin_yang=yin_yang,
        ano_efetivo_calculo=ano_efetivo,
        tronco_celeste=tronco,
        ramo_terrestre=ramo,
        metodologia=METODOLOGIA,
    )
