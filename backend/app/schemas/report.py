from pydantic import BaseModel, Field
from datetime import date
from typing import Optional

class CustomReportRequest(BaseModel):
    columns: list[str] = Field(..., description="List of columns to include in the report")
    start_date: Optional[date] = None
    end_date: Optional[date] = None
