"""
Sistema egípcio: sistematização moderna de 12 divindades por faixa fixa de
data civil (dia/mês, independente do ano). É o "zodíaco egípcio" popular
(o mesmo formato usado por tabelas de horóscopo egípcio publicadas desde os
anos 1990) — não é astronomia do Egito antigo, e o serviço nunca deve ser
lido como se fosse.

As faixas cobrem o ano inteiro sem sobreposição nem lacuna. `periodo` é
devolvido no formato "DD/MM a DD/MM", igual ao exemplo do contrato de dados
(Toth: "09/05 a 02/06").
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date

METODOLOGIA = (
    "Sistematização moderna de 12 divindades por faixa de data civil, "
    "popularizada no século XX. Não é um sistema astronômico comprovado do "
    "Egito antigo — tratamos como referência cultural, não como registro "
    "histórico."
)

# (mês_inicio, dia_inicio, mês_fim, dia_fim, divindade)
# Faixas contíguas cobrindo o ano inteiro, sem sobreposição.
_FAIXAS: list[tuple[int, int, int, int, str]] = [
    (1, 1, 1, 7, "Ísis"),
    (1, 8, 1, 21, "Néftis"),
    (1, 22, 1, 31, "Néftis"),
    (2, 1, 2, 10, "Amón-Rá"),
    (2, 11, 2, 29, "Osíris"),
    (3, 1, 3, 10, "Ísis"),
    (3, 11, 3, 31, "Hórus"),
    (4, 1, 4, 19, "Anúbis"),
    (4, 20, 5, 8, "Set"),
    (5, 9, 6, 2, "Toth"),
    (6, 3, 6, 12, "Néftis"),
    (6, 13, 6, 29, "Rá"),
    (6, 30, 7, 13, "Anúbis"),
    (7, 14, 7, 28, "Ísis"),
    (7, 29, 8, 11, "Hathor"),
    (8, 12, 8, 26, "Sekhmet"),
    (8, 27, 9, 8, "Set"),
    (9, 9, 9, 22, "Toth"),
    (9, 23, 10, 2, "Hórus"),
    (10, 3, 10, 17, "Hórus"),
    (10, 18, 10, 26, "Sekhmet"),
    (10, 27, 11, 15, "Bastet"),
    (11, 16, 11, 25, "Néftis"),
    (11, 26, 12, 18, "Ísis"),
    (12, 19, 12, 31, "Osíris"),
]

_MESES_DIAS = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]  # ano bissexto p/ fevereiro


def _chave(mes: int, dia: int) -> int:
    return mes * 100 + dia


class DataInvalidaError(ValueError):
    pass


@dataclass(frozen=True)
class SistemaEgipcioResultado:
    divindade: str
    periodo: str
    metodologia: str


def calcular_sistema_egipcio(data_nascimento: date) -> SistemaEgipcioResultado:
    chave = _chave(data_nascimento.month, data_nascimento.day)

    for mes_i, dia_i, mes_f, dia_f, divindade in _FAIXAS:
        inicio = _chave(mes_i, dia_i)
        fim = _chave(mes_f, dia_f)
        if inicio <= fim:
            dentro = inicio <= chave <= fim
        else:
            # faixa que atravessa a virada do ano (não usada hoje, mas
            # suportada por robustez)
            dentro = chave >= inicio or chave <= fim
        if dentro:
            periodo = f"{dia_i:02d}/{mes_i:02d} a {dia_f:02d}/{mes_f:02d}"
            return SistemaEgipcioResultado(
                divindade=divindade,
                periodo=periodo,
                metodologia=METODOLOGIA,
            )

    raise DataInvalidaError(f"Nenhuma faixa egípcia cobre {data_nascimento.isoformat()}.")
