"""API response models (docs/frontend/shiftfix-openapi.yaml). Fields are camelCase on the wire."""

from typing import Any, Generic, Literal, TypeVar

from pydantic import BaseModel, ConfigDict, Field
from pydantic.alias_generators import to_camel

ContractType = Literal["full_time", "part_time", "student"]
Language = Literal["nl", "fr", "en"]
ChannelType = Literal["telegram", "sms", "whatsapp", "email", "phone"]
ShiftStatus = Literal["scheduled", "open", "cancelled"]
OfferStatus = Literal["pending", "accepted", "declined", "expired", "cancelled"]
RuleId = Literal["qualification", "availability", "no_overlap", "min_rest", "max_daily", "max_weekly", "student_quota"]
AuditAction = Literal[
    "absence_reported", "shift_opened", "offer_sent", "offer_declined",
    "offer_accepted", "shift_assigned", "assignment_rejected", "worker_updated",
]


class ApiModel(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)


T = TypeVar("T")


class Page(ApiModel, Generic[T]):
    items: list[T]
    next_cursor: str | None


class QualificationRef(ApiModel):
    code: str
    name: str


class WorkerQualification(QualificationRef):
    valid_until: str | None


class ContactChannel(ApiModel):
    type: ChannelType
    address: str
    is_preferred: bool


class CurrentShift(ApiModel):
    shift_id: int
    worker_id: int
    first_name: str
    last_name: str
    qualification: QualificationRef
    ends_at: str


class CalendarShift(ApiModel):
    shift_id: int
    status: ShiftStatus
    worker_id: int | None
    first_name: str | None
    last_name: str | None
    starts_at: str
    ends_at: str


class ShiftDetail(CalendarShift):
    qualification: QualificationRef


class Candidate(ApiModel):
    worker_id: int
    first_name: str
    last_name: str
    score: int = Field(ge=0, le=100)
    offer_status: OfferStatus | None


class Exclusion(ApiModel):
    worker_id: int
    first_name: str
    last_name: str
    failed_rules: list[RuleId]


class Offer(ApiModel):
    offer_id: int
    worker_id: int
    wave: int
    status: OfferStatus
    sent_at: str
    responded_at: str | None


class ContactInfo(ApiModel):
    channels: list[ContactChannel]


class WorkerRow(ApiModel):
    worker_id: int
    first_name: str
    last_name: str
    contract_type: ContractType
    qualifications: list[QualificationRef]


class WorkerDetail(ApiModel):
    worker_id: int
    first_name: str
    last_name: str
    contract_type: ContractType
    contract_hours_per_week: float
    hourly_rate_cents: int
    priority_factor: int
    language: Language
    student_hours_external_ytd: float
    is_active: bool
    qualifications: list[WorkerQualification]
    contact_channels: list[ContactChannel]
    worked_hours_this_week: float


class Change(ApiModel):
    field: str
    from_: Any = Field(alias="from")
    to: Any


class HistoryEntry(ApiModel):
    occurred_at: str
    actor: str
    action: AuditAction
    shift_id: int | None
    changes: list[Change] | None
