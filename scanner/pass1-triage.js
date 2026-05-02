
import { buildTriagePrompt } from "./prompt-builder.js";
import {callLLM} from "..utils/retry.js";

export async function runPass1Triage({contractSource, contractName, languagea, version,skills}) {
    const {systemPrompt, userPrompt} = buildTriagePrompt({
        contractSource,
        contractName,language,
        version,
        skills,
    });

    const raw = await callLLM({systemPrompt, userPrompt, label: "pass 1 traige"});
    return parseTriageResponse(raw);
}

function parseTriageResponse(raw){
    const cleaned=raw.replce(/^```(?:json)?\s*/m, "").replace(/\s*```\s*$/m,"").trim();

    let parsed;
    try{
        parsed=JSON.parse(cleaned);

    }catch{
        const match=cleaned.match(/\{[\s\S]*\}/);
        if(!match) throw new Error(`Pass 1 LLM returned non-JSSON:\n${raw.slice(0,300)}`);
        parsed=JSON.parse(match[0]);
    }

    if(!parsed.riskyFunctions || !Array.isArray(parsed.riskyFunctions)) {
        throw new Error("Pass 1 response missing riskyFunctions array");
    }

    parsed.pass1Findings = (parsed.pass1Findings || []).map((f,i) => ({
        id: f.id || `P1-${String(i+1).padStart(2,"0")}`,
        pass:1,
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