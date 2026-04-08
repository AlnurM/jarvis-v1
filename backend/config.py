from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    MONGO_URL: str
    MONGODB_DB: str = "jarvis"
    PORT: int = 8080
    CLAUDE_API_KEY: str = ""
    OPENWEATHER_API_KEY: str = ""
    BRAVE_SEARCH_API_KEY: str = ""
    LATITUDE: float = 43.2220
    LONGITUDE: float = 76.8512

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()
