import hashlib
import hmac

from fastapi import HTTPException

from app.core.config import get_claim_token_secret

MIN_CLAIM_TOKEN_LENGTH = 8
MAX_CLAIM_TOKEN_LENGTH = 64


def normalize_claim_token(token: str) -> str:
    normalized_token = token.strip()
    if len(normalized_token) < MIN_CLAIM_TOKEN_LENGTH:
        raise HTTPException(status_code=422, detail="Token must have at least 8 characters")
    if len(normalized_token) > MAX_CLAIM_TOKEN_LENGTH:
        raise HTTPException(status_code=422, detail="Token must have at most 64 characters")
    return normalized_token


def claim_token_hash(token: str) -> str:
    normalized_token = normalize_claim_token(token)
    secret = get_claim_token_secret()
    return hmac.new(secret.encode("utf-8"), normalized_token.encode("utf-8"), hashlib.sha256).hexdigest()


def verify_claim_token(token: str, stored_hash: str) -> bool:
    return hmac.compare_digest(claim_token_hash(token), stored_hash)
