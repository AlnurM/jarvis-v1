from fastapi import Request
from pymongo.asynchronous.database import AsyncDatabase


def get_db(request: Request) -> AsyncDatabase:
    """Get the MongoDB database from app state. Use in route dependencies."""
    return request.app.state.db
