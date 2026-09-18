import pytest

from app.core import config


def test_claim_token_secret_keeps_development_fallback(monkeypatch) -> None:
    monkeypatch.setattr(config, "IS_PRODUCTION", False)
    monkeypatch.delenv("CLAIM_TOKEN_SECRET", raising=False)
    assert config.get_claim_token_secret() == "dev-claim-token-secret"


def test_claim_token_secret_requires_value_in_production(monkeypatch) -> None:
    monkeypatch.setattr(config, "IS_PRODUCTION", True)
    monkeypatch.delenv("CLAIM_TOKEN_SECRET", raising=False)
    with pytest.raises(RuntimeError, match="CLAIM_TOKEN_SECRET must be configured in production"):
        config.validate_runtime_security_config()


def test_claim_token_secret_accepts_configured_production_value(monkeypatch) -> None:
    monkeypatch.setattr(config, "IS_PRODUCTION", True)
    monkeypatch.setenv("CLAIM_TOKEN_SECRET", "configured-value")
    assert config.get_claim_token_secret() == "configured-value"
