"""
Geocoding via Nominatim (OpenStreetMap) + timezone via timezonefinder.

Regras de uso do Nominatim que este módulo respeita:
- User-Agent identificável (exigência deles — TAREFA P2 item 11 do CLAUDE.md
  do projeto TRÍADE). Nunca usar um User-Agent genérico tipo "python-requests".
- No máximo 1 requisição por segundo. Como o serviço roda single-process,
  um lock + timestamp da última chamada já garante isso; em produção com
  múltiplos workers isso precisaria de um limitador compartilhado (Redis,
  etc.) — ver TODO no fim do arquivo.
- `lru_cache` evita repetir a mesma consulta (cidade, país) na vida do
  processo. P1 item 10 do CLAUDE.md pede cache persistente (Supabase) — não
  é responsabilidade deste serviço, é do backend Next.js.
"""

from __future__ import annotations

import threading
import time
from dataclasses import dataclass
from functools import lru_cache

import requests
from timezonefinder import TimezoneFinder

NOMINATIM_URL = "https://nominatim.openstreetmap.org/search"

# Identificação real do produto, com contato — exigência de uso do Nominatim.
# https://operations.osmfoundation.org/policies/nominatim/
USER_AGENT = "TriadeAstroCalcService/1.0 (+https://triade.app; contato: suporte@triade.app)"

_MIN_INTERVALO_SEGUNDOS = 1.0
_ultima_chamada_lock = threading.Lock()
_ultima_chamada_ts = 0.0

_tf = TimezoneFinder()


class GeocodingError(Exception):
    """Cidade não encontrada, ou falha de rede/serviço do Nominatim."""


@dataclass(frozen=True)
class ResultadoGeocoding:
    latitude: float
    longitude: float
    timezone_iana: str
    nome_completo: str


def _respeitar_rate_limit() -> None:
    global _ultima_chamada_ts
    with _ultima_chamada_lock:
        agora = time.monotonic()
        espera = _MIN_INTERVALO_SEGUNDOS - (agora - _ultima_chamada_ts)
        if espera > 0:
            time.sleep(espera)
        _ultima_chamada_ts = time.monotonic()


@lru_cache(maxsize=2048)
def geocodificar(cidade: str, pais: str) -> ResultadoGeocoding:
    """
    Converte cidade+país em latitude/longitude/timezone IANA.

    Levanta `GeocodingError` se a cidade não for encontrada ou se a
    requisição falhar (rede indisponível, timeout, erro do serviço).
    """
    query = f"{cidade}, {pais}"

    _respeitar_rate_limit()

    try:
        resposta = requests.get(
            NOMINATIM_URL,
            params={"q": query, "format": "json", "limit": 1, "addressdetails": 0},
            headers={"User-Agent": USER_AGENT},
            timeout=10,
        )
        resposta.raise_for_status()
        resultados = resposta.json()
    except requests.RequestException as causa:
        raise GeocodingError(f"Falha ao consultar geocoding para '{query}': {causa}") from causa
    except ValueError as causa:
        raise GeocodingError(f"Resposta inválida do geocoding para '{query}': {causa}") from causa

    if not resultados:
        raise GeocodingError(f"Cidade não encontrada: '{query}'.")

    primeiro = resultados[0]
    try:
        latitude = float(primeiro["lat"])
        longitude = float(primeiro["lon"])
    except (KeyError, TypeError, ValueError) as causa:
        raise GeocodingError(f"Resposta do geocoding sem coordenadas para '{query}'.") from causa

    timezone_iana = _tf.timezone_at(lat=latitude, lng=longitude)
    if not timezone_iana:
        raise GeocodingError(f"Não foi possível determinar o fuso horário para '{query}'.")

    return ResultadoGeocoding(
        latitude=latitude,
        longitude=longitude,
        timezone_iana=timezone_iana,
        nome_completo=primeiro.get("display_name", query),
    )


# TODO P2: em produção com múltiplos workers/processos (ex.: Railway com
# vários dynos), o rate-limit em memória e o lru_cache não são compartilhados
# entre processos. Nesse caso, mover para um limitador + cache externos
# (Redis) ou reduzir para 1 worker single-process, já que o volume de
# geocoding de um app de mapa astral é baixo.
