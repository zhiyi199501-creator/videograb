import asyncio

import pytest

from services.summarizer import _await_with_heartbeat


def test_await_with_heartbeat_returns_result():
    async def quick():
        await asyncio.sleep(0.01)
        return "ok"

    async def collect():
        events = []
        async for item in _await_with_heartbeat(
            quick(), status_prefix="正在生成思维导图"
        ):
            events.append(item)
        return events

    events = asyncio.run(collect())
    assert events[-1] == {"event": "_result", "data": "ok"}


def test_await_with_heartbeat_propagates_error():
    async def boom():
        await asyncio.sleep(0.01)
        raise RuntimeError("mindmap failed")

    async def collect():
        async for _ in _await_with_heartbeat(
            boom(), status_prefix="正在生成思维导图"
        ):
            pass

    with pytest.raises(RuntimeError, match="mindmap failed"):
        asyncio.run(collect())
