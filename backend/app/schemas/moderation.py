from sqlmodel import SQLModel


class ReviewStatusCounts(SQLModel):
    all: int
    pending: int
    approved: int
    rejected: int


class ReportStatusCounts(SQLModel):
    all: int
    open: int
    closed: int


class AdminModerationCounts(SQLModel):
    photos: ReviewStatusCounts
    memories: ReviewStatusCounts
    reports: ReportStatusCounts
