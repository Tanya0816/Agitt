import json
import asyncio
from dataclasses import dataclass
from typing import Optional
from enum import Enum
from agent.llm_adapter import get_llm_response, Message
from agent.prompts import AUDIT_PROMPTS
from agent.slither_runner import run_slither

class Severity(str, Enum):
    CRITICAL = "Critical"
    HIGH = "High"
    MEDIUM = "Medium"
    LOW = "Low"
    INFO = "Info"

_SEVERITY_ORDER = {
    Severity.CRITICAL: 0,
    Severity.HIGH: 1,
    Severity.MEDIUM: 2,
    Severity.LOW: 3,
    Severity.INFO: 4,
}

@dataclass
class AuditFindings:
    category: str
    source: str
    found: bool
    severity: Optional[Severity]
    line: Optional[int]
    title: Optional[str]
    explanation: Optional[str]
    patch: Optional[str]

    def to_dict(self) -> dict:
        return {
            "category": self.category,
            "source": self.source,
            "found": self.found,
            "severity": self.severity.value if self.severity else None,
            "line": self.line,
            "title": self.title,
            "explanation": self.explanation,
            "patch": self.patch,
        }
    






