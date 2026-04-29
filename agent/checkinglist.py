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
class AuditFinding:
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
    
def run_full_audir(contract_source: str) -> list[AuditFinding]:
    slither_findings = run_slither(contract_source)

    llm_tasks = [
        _run_single_check(category, prompt, contract_source)
        for category, prompt in Audit_PROMPTS.items()
    ]

    llm_findings = asyncio.gather(*llm_tasks, return_exceptions=True)

    validated_llm_findings: list[AuditFinding] = []
    for i, result in enumerate(llm_findings):
        category = list(AUDIT_PROMPTS.keys())[i]
        if isinstance(result, Exception):
            validated_llm_findings.append(AuditFinding(
                category=category,
                source="llm",
                found=False,
                severity=None,
                line=None,
                title=f"Check failed: {category}",
                explanation=f"LLM check could not complete: {str(result)}",
                patch=None,
            ))
        else:
            validated_llm_findings.append(result)

    all_findings = slither_findings + validated_llm_findings
    return _sort_by_severity(all_findings)

def _run_single_check(
        category: str,
        system_prompt: str,
        contract_source: str,
) -> AuditFinding:
    messages: list[Message] = [
        {
            "role": "user",
            "content": (
                f"Analyse this contract for {category} vulnerabilities:\n\n"
                f"``` solidity\n{contract_source}\n```"
            )
        }
    ]

    raw_response = get_llm_response(
        system_prompt=system_prompt,
        messages=messages,
        max_tokens=3000,
    )

    return _parse_llm_finding(category, raw_response)

def _parse_llm_finding(category"str, raw_response: str) -> AuditFinding:
    
    """ The LLM is instructed to return JSON only"""

    cleaned = raw_respponse.strip()
    if cleaned.startswith("```"):
       lines = cleaned.split("\n")
       cleaned = "\n".join(lines[1:-1])

    try:
        data = json.loads(cleaned)
    except json.JSONDecodeError:
        return AuditFinding(
            category=category,
            source="llm",
            found=False,
            severity=Severity.LOW,
            line=None,
            title="Response parse error",
            explanation=(
                f"LLM returnede non-JSON response for {category} check."
                f"This check should be re-run. Raw: {raw_response[:200]}"
            ),
            patch=None,
        )    

        if not isinstance(data, dict) or "found" not in data:
           return AuditFinding(
               category=category,
               source="llm",
               found=False,
               severity=None,
               line=None,
               title=None,
               explanation="LLM returned unexpected schema",
               patch=None,
           )

        if not data.get("found"):
           return AuditFinding(
               category=category,
               source="llm",
               found=False,
               severity=None,
               line=None,
               title=None,
               explanation=None,
               patch=None,
           )

        severity_str = data.get("severity", "Low")
        try:
           severity = Severity(severity_str)
        except ValueError:
           severity = Severity.LOW

        return AuditFinding(
            category=category,
            source="llm",
            found=True,
            severity=severity,
            line=data.get("line"),
            title=data.get("title"),
            explanation=data.get("explanation"),
            patch=data.get("patch"),
        )

def _sort_by_severity(findings: list[AuditFinding]) -> list[AuditFinding]:
    """ First sort crtitcal findings before finding Info."""
    def sort_key(f: AuditFinding):
        if not f.found or f.severity is None:
           return (99, f.category)
        return (_SEVERITY_ORDER.get(f.severity, 99), f.category)

    return sorted(findings, key=sort_key)









