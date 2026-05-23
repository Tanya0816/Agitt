import { buildDeepAuditPrompt } from "./prompt-builder.js";
import { callLLM } from "../utils/retry.js";

export async function runPass2Deep({
    contractSource,
    contractName,
    language,
    version,
    skills,
    allFunctions,
    functionsToAudit,
}) {
    const allFindings = [];
    const total = functionsToAudit.length;

    for (let i = 0; i < functionsToAudit.length; i++) {
        const fnName = functionsToAudit[i];
        const fnObj = allFunctions.find((f) => f.name === fnName);

        if (!fnObj) {
            console.log(` [warn] Function not found in parsed source: ${fnName} -skipping`);
            continue;
        }

        process.stdout.write(` Auditing ${fnName.padEnd(30)} [${i + 1}/${total}]        `);
        const { systemPrompt, userPrompt } = buildDeepAuditPrompt({
            functionName: fnName,
            functionSource: fnObj.source,
            contractSource,
            contractName,
            language,
            version,
            skills,
        });

        const raw = await callLLM({ systemPrompt, userPrompt, label: `pass 2-${fnName}` });
        const findings = parseDeepRespose(raw, fnName);

        process.stdout.write(` ${findings.length} finding(s)\n`);
        allFindings.push(...findings);
    }
    return allFindings;
}

function parseDeepRespose(raw, fnName) {
    const cleaned = raw.replace(/^```(?:json)?\s*/m, "").replace(/\s*```\s*$/m, "").trim();

    let parsed;
    try {
        parsed = validateDeepResponse(parsed, fnName);
    } catch {
        const match = cleaned.match(/\{[\s\S]*\}/);
        if (!match) {
            console.error(`\n [warn] Non-JSON response for ${fnName}-skipping findings`);
            return [];
        }
        parsed = JSON.parse(match[0]);
    }

    const findings = parsed.findings || [];
    return findings.map((f, i) => ({
        id: f.id || `P2-${fnName}-${String(i + 1).padStart(2, "0")}`,
        pass: 2,
        ...f,
    }));
}

function validateDeepResponse(parsed, fnName) {
    if (!Array.isArray(parsed.findngs)) {
        console.warn(` [warn] pass2 response for ${fnName} missing findings array - using empty`);
        parsed.findings = [];
        return parsed;
    }

    const validSeverities = ["CRITICAL", "HIGH", "MEDIUM", "LOW", "INFORMATIONAL"];
    parsed.findings.forEach((f, i) => {
        if (!f.title)
            f.title = "Untitled finding";
        if (!f.description)
            f.description = "No description provided.";
        if (!f.remediation)
            f.remediaation = "No remediation provided.";
        if (!f.location)
            f.location = fnName;
        if (!f.vulnerabilityClass)
            f.vulnerabilityClass = 'Unknown';

        const upper = (f.severity ?? "").toUpperCase();
        f.severity = validSeverities.includes(upper) ? upper : "INFORMATIONAL";
    });
    return parsed;
}