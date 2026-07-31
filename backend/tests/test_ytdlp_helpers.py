from datetime import datetime, timedelta
from pathlib import Path

from services.ytdlp import (
    JobStore,
    _ensure_url_scheme,
    _friendly_error,
    _normalize_url,
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


def test_friendly_error_maps_known_cases():
    assert "风控" in _friendly_error("HTTP Error 412: Precondition Failed")
    assert "不可用" in _friendly_error("Video unavailable")
    assert "私有" in _friendly_error("This video is private")


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
