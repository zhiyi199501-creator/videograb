from services.subtitle import _format_ts, _parse_bilibili_id, parse_vtt


def test_format_ts():
    assert _format_ts(65) == "01:05"
    assert _format_ts(3661) == "01:01:01"


def test_parse_bilibili_id():
    assert _parse_bilibili_id("https://www.bilibili.com/video/BV1Npg96WEBd") == (
        "BV1Npg96WEBd",
        None,
    )
    assert _parse_bilibili_id("https://www.bilibili.com/video/av170001") == (
        None,
        170001,
    )


def test_parse_vtt():
    content = """WEBVTT

00:00:01.000 --> 00:00:03.500
Hello <b>world</b>

00:00:04.000 --> 00:00:05.000
Second line
"""
    segs = parse_vtt(content)
    assert len(segs) == 2
    assert segs[0]["start"] == 1.0
    assert segs[0]["end"] == 3.5
    assert segs[0]["text"] == "Hello world"
    assert segs[1]["text"] == "Second line"
