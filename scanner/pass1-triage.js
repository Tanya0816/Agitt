
import { buildTriagePrompt } from "./prompt-builder.js";
import { callLLM } from "../utils/retry.js";

export async function runPass1Triage({ contractSource, contractName, language, version, skills }) {
    const { systemPrompt, userPrompt } = buildTriagePrompt({
        contractSource,
        contractName, language,
        version,
        skills,
    });

    const raw = await callLLM({ systemPrompt, userPrompt, label: "pass 1 traige" });
    return parseTriageResponse(raw);
}

function parseTriageResponse(raw) {
    const cleaned = raw.replace(/^```(?:json)?\s*/m, "").replace(/\s*```\s*$/m, "").trim();

    let parsed;
    try {
        parsed = validateTriageResponse(parsed);

    } catch {
        const match = cleaned.match(/\{[\s\S]*\}/);
        if (!match) throw new Error(`Pass 1 LLM returned non-JSON:\n${raw.slice(0, 300)}`);
        parsed = JSON.parse(match[0]);
    }

    if (!parsed.riskyFunctions || !Array.isArray(parsed.riskyFunctions)) {
        throw new Error("Pass 1 response missing riskyFunctions array");
    }

    parsed.pass1Findings = (parsed.pass1Findings || []).map((f, i) => ({
        id: f.id || `P1-${String(i + 1).padStart(2, "0")}`,
        pass: 1,
        ...f,
    }));

    return {
        summary: parsed.summary || "",
        riskyFunctions: parsed.riskyFunctions,
        pass1Findings: parsed.pass1Findings,
        positives: parsed.positives || [],
        gasOptimizations: parsed.gasOptimizations || [],
        auditNotes: parsed.auditNotes || "",

    };
}

function validateTriageResponse(parsed) {
    const error = [];

    if (typeof parsed.summary !== "string")
        errors.push("missing summary string");

    if (!Array.isArray(parsed.riskyFunctions))
        errors.push("missing riskyFunctions array");

    if (!Array.isArray(parsed.pass1Findings))
        errors.push("missing pass1indings array");

    // validate each finding 
    const validSeverities = ["CRITICAL", "HIGH", "MEDIUM", "LOW", "INFORMATIONAL"];
    (parsed.pass1Findings ?? []).forEach((f, i) => {
        if (!f.title) errors.push('finding[${i}] missing title');
        if (!f.description) errors.push('findings[${i}] missing description');
        if (!f.remediation) errors.push('finding[${i}] missing remediation');
        if (!validSeverities.includes(f.severity)) {
            // auto correct common Gemini derivations
            const upper = (f.severity ?? "").toUpperCase();
            if (validSeverities.includes(upper)) {
                f.severity = upper;
            } else {
                f.severity = "INFORMATIONAL";
                errors.push(`finding[${i}] invalid severity "${f.severity}" - set to INFORMATIONAL`);
            }
        }
    });

    if (errors.length > 0) {
        console.warn(` [warn] Schema issues in triage response:\n   -${errors.join("\n  -")}`);
    }
    return parsed;
    // return corrected objecet even if there were warnings
}