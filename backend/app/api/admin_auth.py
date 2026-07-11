from secrets import compare_digest

from fastapi import Header, HTTPException, status

from app.core.config import get_admin_token


def validate_admin_token(authorization: str | None) -> None:
    expected_token = get_admin_token()
    if not expected_token:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Admin token is not configured")

    scheme, _, token = (authorization or "").partition(" ")
    if scheme.lower() != "bearer" or not token or not compare_digest(token, expected_token):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid admin token",
            headers={"WWW-Authenticate": "Bearer"},
        )


def require_admin_token(authorization: str | None = Header(default=None)) -> None:
    validate_admin_token(authorization)
