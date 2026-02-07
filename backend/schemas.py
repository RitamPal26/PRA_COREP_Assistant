from pydantic import BaseModel, Field
from typing import Optional

class CorepFieldUpdate(BaseModel):
    field_id: str
    value: float
    rule_ref: str
    reasoning: str

class AnalysisResponse(BaseModel):
    response_text: str
    data_update: Optional[CorepFieldUpdate] = None