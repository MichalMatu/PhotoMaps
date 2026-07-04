from sqlmodel import SQLModel


class AudioAttachment(SQLModel):
    public_path: str
    mime_type: str
    size_bytes: int
    duration_seconds: float
