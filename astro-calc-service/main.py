"""
astro-calc-service — serviço FastAPI que CALCULA (não interpreta) os três
sistemas do TRÍADE: mapa ocidental, signo chinês, sistema egípcio.

Rodar localmente:
    uvicorn main:app --reload --port 8000

Ver README.md para detalhes de bibliotecas usadas e limitações conhecidas.
"""

from __future__ import annotations

from datetime import date, datetime, time

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.calculators.chinese import AnoForaDaTabelaError, calcular_signo_chines
from app.calculators.egyptian import DataInvalidaError, calcular_sistema_egipcio
from app.calculators.western import calcular_mapa_ocidental
from app.models import (
    DadosNascimento,
    DataNascimentoInput,
    ErroResposta,
    MapaOcidental,
    SignoChines,
    SistemaEgipcio,
)
from app.services.geocoding import GeocodingError, geocodificar

app = FastAPI(
    title="astro-calc-service",
    description="Serviço de cálculo astrológico do TRÍADE. Só calcula, nunca interpreta.",
    version="1.0.0",
)

# TODO P2: restringir CORS ao domínio do frontend em produção.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


def _erro(codigo: str, mensagem: str, status_code: int) -> JSONResponse:
    corpo = ErroResposta(erro={"codigo": codigo, "mensagem": mensagem})
    return JSONResponse(status_code=status_code, content=corpo.model_dump())


@app.get("/")
def raiz() -> dict:
    return {"servico": "astro-calc-service", "status": "ok"}


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}


@app.post("/calcular/mapa-ocidental")
async def endpoint_mapa_ocidental(request: Request):
    corpo = await request.json()
    dados_brutos = corpo.get("dados")
    if dados_brutos is None:
        return _erro("ENTRADA_INVALIDA", "Corpo precisa do envelope {\"dados\": {...}}.", 422)

    try:
        dados = DadosNascimento.model_validate(dados_brutos)
    except Exception as causa:
        return _erro("ENTRADA_INVALIDA", f"Dados de nascimento inválidos: {causa}", 422)

    try:
        data_nascimento = date.fromisoformat(dados.data_nascimento)
    except ValueError:
        return _erro("ENTRADA_INVALIDA", "data_nascimento precisa ser YYYY-MM-DD.", 422)

    try:
        hora_nascimento = time.fromisoformat(dados.hora_nascimento)
    except ValueError:
        return _erro("ENTRADA_INVALIDA", "hora_nascimento precisa ser HH:MM.", 422)

    try:
        geo = geocodificar(dados.cidade, dados.pais)
    except GeocodingError as causa:
        return _erro("GEOCODING_FALHOU", str(causa), 422)

    try:
        resultado = calcular_mapa_ocidental(
            data_nascimento=data_nascimento,
            hora_nascimento=hora_nascimento,
            hora_desconhecida=dados.hora_desconhecida,
            latitude=geo.latitude,
            longitude=geo.longitude,
            timezone_iana=geo.timezone_iana,
        )
    except Exception as causa:  # noqa: BLE001 - erro de cálculo inesperado -> 500
        return _erro("ERRO_CALCULO", f"Falha ao calcular o mapa: {causa}", 500)

    resposta = MapaOcidental(
        sol={
            "signo": resultado.sol.signo,
            "grau": resultado.sol.grau,
            "retrogrado": resultado.sol.retrogrado,
            "grau_absoluto": resultado.sol.grau_absoluto,
            "casa": resultado.sol.casa,
        },
        lua={
            "signo": resultado.lua.signo,
            "grau": resultado.lua.grau,
            "retrogrado": resultado.lua.retrogrado,
            "grau_absoluto": resultado.lua.grau_absoluto,
            "casa": resultado.lua.casa,
        },
        ascendente=resultado.ascendente,
        meio_ceu=resultado.meio_ceu,
        planetas={
            chave: {
                "signo": p.signo,
                "grau": p.grau,
                "retrogrado": p.retrogrado,
                "grau_absoluto": p.grau_absoluto,
                "casa": p.casa,
            }
            for chave, p in resultado.planetas.items()
        },
        casas=resultado.casas,
        aspectos=resultado.aspectos,
        metadata={
            "sistema_casas": "Placidus",
            "data_hora_utc_usada": resultado.data_hora_utc_usada,
        },
        localizacao_usada={
            "latitude": geo.latitude,
            "longitude": geo.longitude,
            "timezone_iana": geo.timezone_iana,
            "cidade": dados.cidade,
            "pais": dados.pais,
            "nome_completo": geo.nome_completo,
        },
        hora_confiavel=resultado.hora_confiavel,
    )
    return resposta


@app.post("/calcular/signo-chines")
async def endpoint_signo_chines(request: Request):
    corpo = await request.json()
    try:
        entrada = DataNascimentoInput.model_validate(corpo)
        data_nascimento = date.fromisoformat(entrada.data_nascimento)
    except ValueError:
        return _erro("ENTRADA_INVALIDA", "data_nascimento precisa ser YYYY-MM-DD.", 422)
    except Exception as causa:
        return _erro("ENTRADA_INVALIDA", f"Entrada inválida: {causa}", 422)

    try:
        resultado = calcular_signo_chines(data_nascimento)
    except AnoForaDaTabelaError as causa:
        return _erro("ANO_FORA_DA_TABELA", str(causa), 422)

    return SignoChines(
        animal=resultado.animal,
        elemento=resultado.elemento,
        yin_yang=resultado.yin_yang,
        ano_efetivo_calculo=resultado.ano_efetivo_calculo,
        tronco_celeste=resultado.tronco_celeste,
        ramo_terrestre=resultado.ramo_terrestre,
        metodologia=resultado.metodologia,
    )


@app.post("/calcular/sistema-egipcio")
async def endpoint_sistema_egipcio(request: Request):
    corpo = await request.json()
    try:
        entrada = DataNascimentoInput.model_validate(corpo)
        data_nascimento = date.fromisoformat(entrada.data_nascimento)
    except ValueError:
        return _erro("ENTRADA_INVALIDA", "data_nascimento precisa ser YYYY-MM-DD.", 422)
    except Exception as causa:
        return _erro("ENTRADA_INVALIDA", f"Entrada inválida: {causa}", 422)

    try:
        resultado = calcular_sistema_egipcio(data_nascimento)
    except DataInvalidaError as causa:
        return _erro("ENTRADA_INVALIDA", str(causa), 422)

    return SistemaEgipcio(
        divindade=resultado.divindade,
        periodo=resultado.periodo,
        metodologia=resultado.metodologia,
    )
