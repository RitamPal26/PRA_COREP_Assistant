from pydantic import BaseModel, Field, field_validator
from typing import Optional

class CorepFieldUpdate(BaseModel):
    field_id: str
    value: float
    rule_ref: str
    reasoning: str
    source_page: Optional[str] = "Unknown"

    # This is the validation rule causing the error
    @field_validator('value')
    def prevent_negative(cls, v):
        if v < 0:
            raise ValueError("Exposure value cannot be negative in this context.")
        return v

class AnalysisResponse(BaseModel):
    response_text: str
    data_update: Optional[CorepFieldUpdate] = None