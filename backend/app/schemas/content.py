from urllib.parse import urlparse

from pydantic import field_validator, model_validator
from sqlmodel import SQLModel

from app.schemas.contract_types import ContentBlockType


class ContentBlock(SQLModel):
    type: ContentBlockType
    text: str
    url: str | None = None

    @field_validator("text")
    @classmethod
    def validate_text(cls, value: str) -> str:
        normalized = value.strip()
        if not normalized:
            raise ValueError("Content block text cannot be empty")
        return normalized

    @field_validator("url")
    @classmethod
    def validate_url(cls, value: str | None) -> str | None:
        if value is None:
            return None
        normalized = value.strip()
        if not normalized:
            return None
        parsed = urlparse(normalized)
        if parsed.scheme not in {"http", "https"} or not parsed.netloc:
            raise ValueError("Content link URL must be a valid HTTP(S) URL")
        return normalized

    @model_validator(mode="after")
    def validate_block_shape(self) -> "ContentBlock":
        if self.type == "link":
            if not self.url:
                raise ValueError("Content link URL cannot be empty")
            return self
        if self.url is not None:
            raise ValueError("Content block URL is only allowed for link blocks")
        return self
