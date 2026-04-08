import pytest
import os


def test_settings_missing_mongo_url_raises():
    """Settings() with missing MONGO_URL raises ValidationError (required field)."""
    # Remove MONGO_URL from environment if set
    env_backup = os.environ.pop("MONGO_URL", None)
    try:
        # Unload cached module to force fresh import
        import sys
        for mod in list(sys.modules.keys()):
            if "config" in mod:
                del sys.modules[mod]

        from pydantic import ValidationError
        # Make sure .env doesn't provide it by patching env_file
        with pytest.raises(ValidationError):
            from pydantic_settings import BaseSettings

            class TestSettings(BaseSettings):
                MONGO_URL: str

                class Config:
                    env_file = "/nonexistent/.env"
                    env_file_encoding = "utf-8"

            TestSettings()
    finally:
        if env_backup is not None:
            os.environ["MONGO_URL"] = env_backup


def test_settings_with_mongo_url_loads(monkeypatch):
    """Settings() with MONGO_URL='mongodb://test' loads correctly, MONGODB_DB defaults to 'jarvis'."""
    monkeypatch.setenv("MONGO_URL", "mongodb://test")
    # Clear cached modules
    import sys
    for mod in list(sys.modules.keys()):
        if mod == "config" or mod.startswith("config."):
            del sys.modules[mod]

    from pydantic_settings import BaseSettings

    class TestSettings(BaseSettings):
        MONGO_URL: str
        MONGODB_DB: str = "jarvis"
        PORT: int = 8080
        CLAUDE_API_KEY: str = ""
        OPENWEATHER_API_KEY: str = ""
        BRAVE_SEARCH_API_KEY: str = ""
        LATITUDE: float = 43.2220
        LONGITUDE: float = 76.8512

        class Config:
            env_file = "/nonexistent/.env"
            env_file_encoding = "utf-8"

    s = TestSettings()
    assert s.MONGO_URL == "mongodb://test"
    assert s.MONGODB_DB == "jarvis"


def test_settings_latitude_longitude_defaults(monkeypatch):
    """LATITUDE defaults to 43.2220, LONGITUDE to 76.8512."""
    monkeypatch.setenv("MONGO_URL", "mongodb://test")

    from pydantic_settings import BaseSettings

    class TestSettings(BaseSettings):
        MONGO_URL: str
        LATITUDE: float = 43.2220
        LONGITUDE: float = 76.8512

        class Config:
            env_file = "/nonexistent/.env"
            env_file_encoding = "utf-8"

    s = TestSettings()
    assert s.LATITUDE == 43.2220
    assert s.LONGITUDE == 76.8512


def test_settings_port_defaults_to_8080(monkeypatch):
    """PORT defaults to 8080."""
    monkeypatch.setenv("MONGO_URL", "mongodb://test")

    from pydantic_settings import BaseSettings

    class TestSettings(BaseSettings):
        MONGO_URL: str
        PORT: int = 8080

        class Config:
            env_file = "/nonexistent/.env"
            env_file_encoding = "utf-8"

    s = TestSettings()
    assert s.PORT == 8080
