from __future__ import annotations

from typing import Optional

from fastapi import Request

SUPPORTED = (
    "zh",
    "en",
    "es",
    "pt",
    "ja",
    "id",
    "hi",
    "ko",
    "de",
    "fr",
    "ru",
    "ar",
    "tr",
    "th",
    "vi",
)

DEFAULT_LOCALE = "zh"


def parse_accept_language(header: Optional[str]) -> str:
    """Pick the best supported locale from an Accept-Language header."""
    if not header:
        return DEFAULT_LOCALE
    # e.g. "en-US,en;q=0.9,zh-CN;q=0.8"
    parts: list[tuple[str, float]] = []
    for item in header.split(","):
        item = item.strip()
        if not item:
            continue
        lang_part, _, rest = item.partition(";")
        code = lang_part.strip().lower().replace("_", "-")
        q = 1.0
        if rest.startswith("q="):
            try:
                q = float(rest[2:].strip())
            except ValueError:
                q = 0.0
        short = code.split("-")[0]
        parts.append((short, q))
    parts.sort(key=lambda x: x[1], reverse=True)
    for short, _ in parts:
        if short in SUPPORTED:
            return short
    return DEFAULT_LOCALE


def get_request_locale(request: Optional[Request] = None) -> str:
    if request is None:
        return DEFAULT_LOCALE
    # Explicit query wins (useful for tests / SSE clients)
    q = request.query_params.get("locale")
    if q:
        short = q.strip().lower().split("-")[0]
        if short in SUPPORTED:
            return short
    return parse_accept_language(request.headers.get("accept-language"))
