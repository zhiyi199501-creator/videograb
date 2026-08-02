from datetime import datetime, timedelta
from pathlib import Path

import pytest

from services.ytdlp import (
    JobStore,
    _base_opts,
    _ensure_url_scheme,
    _friendly_error,
    _normalize_url,
    _pick_downloaded_file,
    _sanitize_filename,
    _writable_cookiefile,
)


def test_ensure_url_scheme():
    assert _ensure_url_scheme("bilibili.com/video/BV1xx") == (
        "https://bilibili.com/video/BV1xx"
    )
    assert _ensure_url_scheme("https://example.com/a") == "https://example.com/a"
    assert _ensure_url_scheme("") == ""


def test_normalize_url_douyin_and_bilibili():
    assert _normalize_url(
        "https://www.douyin.com/jingxuan?modal_id=123456"
    ) == "https://www.douyin.com/video/123456"
    assert _normalize_url(
        "https://www.iesdouyin.com/share/video/987"
    ) == "https://www.douyin.com/video/987"
    assert _normalize_url(
        "bilibili.com/video/BV1Npg96WEBd/?spm_id_from=333"
    ) == "https://www.bilibili.com/video/BV1Npg96WEBd"


def test_sanitize_filename():
    assert _sanitize_filename('a/b:c*?.mp4') == "a_b_c__.mp4"
    assert len(_sanitize_filename("x" * 300)) == 200


def test_pick_downloaded_file_skips_thumbnail(tmp_path):
    (tmp_path / "thumb.jpg").write_bytes(b"x" * 1000)
    video = tmp_path / "demo title.mp4"
    video.write_bytes(b"y" * 50_000)
    assert _pick_downloaded_file(tmp_path) == video


def test_pick_downloaded_file_prefers_largest_media(tmp_path):
    (tmp_path / "thumb.webp").write_bytes(b"t" * 8000)
    small = tmp_path / "a.m4a"
    small.write_bytes(b"a" * 1000)
    big = tmp_path / "b.mp4"
    big.write_bytes(b"b" * 9000)
    assert _pick_downloaded_file(tmp_path) == big


def test_pick_downloaded_file_empty_raises(tmp_path):
    (tmp_path / "thumb.jpg").write_bytes(b"x" * 100)
    with pytest.raises(RuntimeError, match="no file found"):
        _pick_downloaded_file(tmp_path)


def test_friendly_error_maps_known_cases():
    assert "风控" in _friendly_error("HTTP Error 412: Precondition Failed")
    assert "不可用" in _friendly_error("Video unavailable")
    assert "私有" in _friendly_error("This video is private")
    assert "抖音" in _friendly_error(
        "\x1b[0;31mERROR:\x1b[0m [Douyin] 123: Fresh cookies (not necessarily logged in) are needed"
    )
    assert "\x1b" not in _friendly_error("\x1b[0;31mboom\x1b[0m unavailable")
    assert "YouTube" in _friendly_error(
        "Sign in to confirm you’re not a bot. Use --cookies-from-browser"
    )


def test_base_opts_youtube_uses_cookies_and_web_clients(monkeypatch):
    monkeypatch.setenv("COOKIES_FROM_BROWSER", "chrome")
    monkeypatch.delenv("COOKIES_FILE", raising=False)
    # reset one-shot log flag
    import services.ytdlp as ytdlp

    ytdlp._cookie_opts_logged = False
    opts = _base_opts("https://www.youtube.com/watch?v=BS6cgVyQom0")
    assert opts.get("cookiesfrombrowser") == ("chrome",)
    assert opts["extractor_args"]["youtube"]["player_client"][0] == "web_safari"
    assert "android" not in opts["extractor_args"]["youtube"]["player_client"]


def test_base_opts_youtube_without_cookies_prefers_android(monkeypatch):
    monkeypatch.delenv("COOKIES_FROM_BROWSER", raising=False)
    monkeypatch.delenv("COOKIES_FILE", raising=False)
    import services.ytdlp as ytdlp

    ytdlp._cookie_opts_logged = False
    opts = _base_opts("https://youtu.be/BS6cgVyQom0")
    assert "cookiesfrombrowser" not in opts
    assert "cookiefile" not in opts
    assert opts["extractor_args"]["youtube"]["player_client"][0] == "android"


def test_base_opts_bilibili_still_gets_cookies(monkeypatch):
    monkeypatch.setenv("COOKIES_FROM_BROWSER", "chrome")
    monkeypatch.delenv("COOKIES_FILE", raising=False)
    import services.ytdlp as ytdlp

    ytdlp._cookie_opts_logged = False
    opts = _base_opts("https://www.bilibili.com/video/BV1xx")
    assert opts.get("cookiesfrombrowser") == ("chrome",)
    assert opts["http_headers"]["Referer"] == "https://www.bilibili.com/"


def test_writable_cookiefile_copies_readonly_source(tmp_path, monkeypatch):
    temp_dir = tmp_path / "videos"
    temp_dir.mkdir()
    monkeypatch.setenv("TEMP_DIR", str(temp_dir))
    monkeypatch.setattr("services.ytdlp.TEMP_DIR", str(temp_dir))

    src = tmp_path / "secrets-cookies.txt"
    src.write_text("# Netscape HTTP Cookie File\n.bilibili.com\tTRUE\t/\tFALSE\t0\tSESSDATA\tx\n")
    src.chmod(0o444)

    dest = Path(_writable_cookiefile(str(src)))
    assert dest != src
    assert dest.is_file()
    assert dest.read_text() == src.read_text()
    assert dest.stat().st_mode & 0o200  # writable


def test_writable_cookiefile_reuses_writable_source(tmp_path, monkeypatch):
    temp_dir = tmp_path / "videos"
    temp_dir.mkdir()
    monkeypatch.setattr("services.ytdlp.TEMP_DIR", str(temp_dir))

    src = tmp_path / "cookies.txt"
    src.write_text("# Netscape\n")
    src.chmod(0o600)
    assert _writable_cookiefile(str(src)) == str(src)


def test_job_store_ttl_cleanup():
    store = JobStore()
    jid = store.create("https://example.com/v")
    assert store.get(jid) is not None
    store.update(jid, created_at=datetime.utcnow() - timedelta(hours=5))
    removed = store.cleanup_expired()
    assert removed == 1
    assert store.get(jid) is None
