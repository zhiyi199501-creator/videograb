"""DeepSeek OpenAI-compatible client（流式摘要 / 思维导图 / 问答）。"""

from __future__ import annotations

import logging
import os
from collections.abc import AsyncIterator
from typing import Optional

from openai import AsyncOpenAI

logger = logging.getLogger(__name__)

def _api_key() -> str:
    return os.environ.get("DEEPSEEK_API_KEY", "").strip()


def _base_url() -> str:
    return os.environ.get("DEEPSEEK_BASE_URL", "https://api.deepseek.com").rstrip("/")


def _model() -> str:
    return os.environ.get("DEEPSEEK_MODEL", "deepseek-v4-flash")

SUMMARY_SYSTEM = """你是专业的视频内容分析助手。请根据用户提供的视频字幕，输出结构清晰的中文 Markdown 总结。

要求：
1. 先用 2～4 句话概括视频主题与目标受众
2. 用分级标题与要点列出核心知识结构
3. 提炼关键结论、方法论或可执行建议
4. 如有明显章节/时间线，可简要归纳
5. 只基于字幕内容，不要编造字幕中没有的信息
6. 使用 Markdown（标题、列表、加粗），不要输出代码块包裹全文"""

MINDMAP_SYSTEM = """你是思维导图生成助手。请根据视频总结内容，输出适合 markmap 渲染的 Markdown 大纲。

严格要求：
1. 第一行必须是一级标题 `# 主题`
2. 用 `##` / `###` 或 `-` 缩进列表表示层级，层级清晰、节点简短
3. 只输出 Markdown，不要解释、不要代码围栏
4. 节点数量适中（大约 15～40 个），便于阅读"""

CHAT_SYSTEM = """你是视频学习助手。下面「已知信息」是该视频的字幕摘录。

规则：
1. 优先依据字幕回答用户问题
2. 若问题与视频无关或字幕不足以回答，请明确说明
3. 回答简洁、有条理，可用 Markdown 列表
4. 不要编造字幕中不存在的细节"""


class DeepSeekError(Exception):
    pass


def _require_client() -> AsyncOpenAI:
    key = _api_key()
    if not key:
        raise DeepSeekError(
            "未配置 DEEPSEEK_API_KEY。请在 backend/.env 中设置后重启服务。"
        )
    return AsyncOpenAI(api_key=key, base_url=_base_url())


async def stream_chat(
    messages: list[dict],
    *,
    temperature: float = 0.4,
) -> AsyncIterator[str]:
    client = _require_client()
    try:
        stream = await client.chat.completions.create(
            model=_model(),
            messages=messages,
            stream=True,
            temperature=temperature,
        )
        async for chunk in stream:
            if not chunk.choices:
                continue
            delta = chunk.choices[0].delta
            content = getattr(delta, "content", None)
            if content:
                yield content
    except DeepSeekError:
        raise
    except Exception as e:
        logger.exception("DeepSeek stream failed")
        msg = str(e)
        if "401" in msg or "Authentication" in msg or "invalid" in msg.lower():
            raise DeepSeekError(
                "DeepSeek API Key 无效，请检查 backend/.env 中的 DEEPSEEK_API_KEY"
            ) from e
        raise DeepSeekError(f"DeepSeek 调用失败: {e}") from e


async def complete_chat(
    messages: list[dict],
    *,
    temperature: float = 0.3,
) -> str:
    client = _require_client()
    try:
        resp = await client.chat.completions.create(
            model=_model(),
            messages=messages,
            stream=False,
            temperature=temperature,
        )
        return (resp.choices[0].message.content or "").strip()
    except DeepSeekError:
        raise
    except Exception as e:
        logger.exception("DeepSeek complete failed")
        msg = str(e)
        if "401" in msg or "Authentication" in msg or "invalid" in msg.lower():
            raise DeepSeekError(
                "DeepSeek API Key 无效，请检查 backend/.env 中的 DEEPSEEK_API_KEY"
            ) from e
        raise DeepSeekError(f"DeepSeek 调用失败: {e}") from e


async def stream_summary(subtitle_text: str, title: Optional[str] = None) -> AsyncIterator[str]:
    user = "请总结以下视频字幕内容。"
    if title:
        user += f"\n视频标题：{title}"
    user += f"\n\n字幕：\n{subtitle_text}"
    async for token in stream_chat(
        [
            {"role": "system", "content": SUMMARY_SYSTEM},
            {"role": "user", "content": user},
        ]
    ):
        yield token


async def generate_mindmap(summary: str, title: Optional[str] = None) -> str:
    user = "请根据以下视频总结生成思维导图 Markdown。"
    if title:
        user += f"\n视频标题：{title}"
    user += f"\n\n总结内容：\n{summary}"
    md = await complete_chat(
        [
            {"role": "system", "content": MINDMAP_SYSTEM},
            {"role": "user", "content": user},
        ]
    )
    # 去掉可能的代码围栏
    if md.startswith("```"):
        lines = md.split("\n")
        if lines[0].startswith("```"):
            lines = lines[1:]
        if lines and lines[-1].strip() == "```":
            lines = lines[:-1]
        md = "\n".join(lines).strip()
    return md


async def stream_answer(
    subtitle_text: str,
    question: str,
    title: Optional[str] = None,
) -> AsyncIterator[str]:
    context = subtitle_text
    if title:
        context = f"视频标题：{title}\n\n{subtitle_text}"
    user = f"已知信息：\n{context}\n\n用户问题：{question}"
    async for token in stream_chat(
        [
            {"role": "system", "content": CHAT_SYSTEM},
            {"role": "user", "content": user},
        ],
        temperature=0.3,
    ):
        yield token
