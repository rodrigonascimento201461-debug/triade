"""
Schemas Pydantic do contrato de dados (PARTE 2 do CLAUDE.md do projeto
TRÍADE). O serviço só calcula — nunca interpreta. Nomes de campo aqui têm
que bater exatamente com `shared/types/astro.ts` no repo do app.
"""

from __future__ import annotations

from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# Entrada
# ---------------------------------------------------------------------------


class DadosNascimento(BaseModel):
    data_nascimento: str = Field(..., description="ISO YYYY-MM-DD")
    hora_nascimento: str = Field(..., description="HH:MM, 24h")
    hora_desconhecida: bool = False
    cidade: str
    pais: str


class EnvelopeMapaOcidental(BaseModel):
    dados: DadosNascimento


class DataNascimentoInput(BaseModel):
    data_nascimento: str = Field(..., description="ISO YYYY-MM-DD")


# ---------------------------------------------------------------------------
# 1. mapa-ocidental
# ---------------------------------------------------------------------------


class PosicaoPlanetaria(BaseModel):
    signo: str
    grau: float
    retrogrado: bool | None = None
    grau_absoluto: float | None = None
    casa: int | None = None


class Cuspide(BaseModel):
    signo: str
    grau: float
    casa: int


class Aspecto(BaseModel):
    planeta_1: str
    planeta_2: str
    tipo: str
    diferenca_graus: float


class LocalizacaoUsada(BaseModel):
    latitude: float
    longitude: float
    timezone_iana: str
    cidade: str | None = None
    pais: str | None = None
    nome_completo: str | None = None


class MetadataMapa(BaseModel):
    sistema_casas: str
    data_hora_utc_usada: str


class MapaOcidental(BaseModel):
    sol: PosicaoPlanetaria
    lua: PosicaoPlanetaria
    ascendente: PosicaoPlanetaria
    meio_ceu: PosicaoPlanetaria
    planetas: dict[str, PosicaoPlanetaria]
    casas: list[Cuspide]
    aspectos: list[Aspecto]
    metadata: MetadataMapa
    localizacao_usada: LocalizacaoUsada
    hora_confiavel: bool


# ---------------------------------------------------------------------------
# 2. signo-chines
# ---------------------------------------------------------------------------


class SignoChines(BaseModel):
    animal: str
    elemento: str
    yin_yang: str
    ano_efetivo_calculo: int
    tronco_celeste: str
    ramo_terrestre: str
    metodologia: str


# ---------------------------------------------------------------------------
# 3. sistema-egipcio
# ---------------------------------------------------------------------------


class SistemaEgipcio(BaseModel):
    divindade: str
    periodo: str
    metodologia: str


# ---------------------------------------------------------------------------
# Erros
# ---------------------------------------------------------------------------


class ErroDetalhe(BaseModel):
    codigo: str
    mensagem: str


class ErroResposta(BaseModel):
    erro: ErroDetalhe
