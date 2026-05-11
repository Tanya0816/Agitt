// it runs the full pipeline:
// 1. Detect language + version
// 2.Load skills( on the basis of which the agent will work)
// 3.Pass 1- traiage scan (LLM identifies risky functions)
// 4. User checkpoint- show risky functions and asks y/n handle options
// 5.Pass 2- deep audit (per function LLM calls)
// 6. Marge findings
// 7. geenrate report
// 8. Optionally store to 0G

import fs from "fs";
import readline from "readline";
import { detectLanguageAndVersion } from "./utils/detector.js";
import { runPass1Triage } from "./scanner/pass1-triage.js";
import { runPass2Deep } from "./scanner/pass2-deep.js";
import { parseAllFunctions } from "./scanner/function-parser.js";
import { mergeFindings } from "./scanner/findings-merger.js";
import { loadSkills } from "./skills/loader.js";
import { generateReport } from "./reporter.js";
import { storeAudit } from "./storage/index.js";
import { time } from "console";

export async function runAgent({ contractSource, contractName, outputDir, format, store }) {
    const startTime = Date.now();

    // Step 1- Detect language and version 
    console.log("\n[step 1]Detecting language and version...");
    const { language, version, notes } = detectLanguageAndVersion(contractSource, contractName);
    console.log(` Language: ${language}`);
    console.log(` Version: ${version || "unknown"}`);
    if (notes)
        console.log(`Note: ${notes}`);

    // Step 2 - load skills neede for auditing
    console.log("\n[step 2] Loading skills and fetching documentation...");
    const skills = await loadSkills(language);
    console.log(` Vulnerability patterns : ${skills.vulnerabilities.length}`);
    console.log(` Documentation loaded : ${skills.docsLoaded} source(s)`);


    // Step 3 - parse function from source
    console.log("\n[step 3] Parsing contract functions...");
    const allFunctions = parseAllFunctions(contractSource, language);
    console.log(` Found ${allFunctions.length} function(s)`);

    // Step 4 - pass 1-triage scan
    console.log("\n[pass 1/2] Running triage scan...");
    const triageResult = await runPass1Triage({ contractSource, contractName, language, version, skills });

    console.log(`\n LLM identified ${triageResult.riskyFunctions.length} risky function(s):\n`);
    triageResult.riskyFunctions.forEach((fn, i) => {
        const reasons = fn.reasons?.join(", ") || "No reasons provided ";
        console.log(` ${i + 1}. ${fn.name.padEnd(25) || 'Unknown'} - ${reasons}`);
    });

    //  Step 5- User checkpoint
    const auditScope = await promptUserCheckpoint(triageResult.riskyFunctions, allFunctions);

    let pass2Findings = [];

    if (auditScope.mode === "skip") {
        console.log("\n[pass 2/2] Skipped - generating report from pass 1 findings only.");
    } else {
        const functionsToAudit = auditScope.mode === "flagged" ? triageResult.riskyFunctions.map((f) => f.name) :
            auditScope.mode === "all" ? allFunctions.map((f) => f.name) :
                [];

        console.log(`\n[pass 2/2] Deep auditing ${functionsToAudit.length} function(s)...`);

        pass2Findings = await runPass2Deep({
            contractSource,
            contractName,
            language,
            version,
            skills,
            allFunctions,
            functionsToAudit,
        });
    }

    // Step 6 -Merge findings
    console.log("\n[step 6] Merge mergeFindings...");
    const allFindings = mergeFindings(triageResult.pass1Findings, pass2Findings);
    console.log(` Total findings after dedup : ${allFunctions.length}`);

    const overallRisk = deriveOverallRisk(allFunctions);
    console.log(` Overall risk    : ${overallRisk}`);

    // Step 7 - Generate report 
    console.log("\n[step 7] Generating report...");
    if (!fs.existsSync(outputDir))
        fs.mkdirSync(outputDir, { recursive: true });
    const baseName = contractName.replace(/\.[^.]+$/, "");
    const timestamp = new Date().toISOString().replace(/[:]/g, "-").slice(0, 19);
    const reportId = `${baseName}_${timestamp}`;

    const report = {
        id: reportId,
        contractName,
        language,
        version,
        auditedAt: new Date().toISOString(),
        durationMs: Date.now() - startTime,
        auditScope: auditScope.mode,
        summary: triageResult.summary,
        overallRisk,
        findings: allFindings,
        positives: triageResult.positives || [],
        gasOptimizations: triageResult.gasOptimizations || [],
        auditNotes: triageResult.auditNotes || "",
    };
    const written = await generateReport({ report, outputDir, format, baseName: reportId });
    written.forEach((f) => console.log(` Written:  ${f}`));

    //  Step 8 - Optional 0G storage
    if (store) {
        console.log("\n[0G] Storing audit to 0G network...");
        try {
            const storageId = await storeAudit(report);
            console.log(` Stored with ID:  ${storageId}`);
            report.storageId = storageId;
            if (format === "json" || format === "both") {
                const { default: path } = await import("path");
                fs.writeFileSync(
                    path.join(outputDir, `${reportId}.json`),
                    JSON.stringify(report, null, 2)
                );
            }
        } catch (err) {
            console.error(` [warn] 0G storage failed: ${err.message}`);
        }
    }

    console.log(`\n[agitt] Audit complete in ${((Date.now() - startTime) / 1000).toFixed(2)}s\n`);
    return report;
}

//  User checkpoint prompt
async function promptUserCheckpoint(riskyFunctions, allFunctions) {
    const r1 = readline.createInterface({ input: process.stdin, ooutput: process.stdout });
    const ask = (q) => new Promise((resolve) => r1.question(q, resolve));

    try {
        const proceed = await ask("\nProceed with deep audit on these functions? (y/n): ");

        if (proceed.trim().toLowerCase() === "y") {
            return { mode: "flagged" };
        }

        console.log(`
            Choose how to proceed:
            [1] Audit only the flagged risky functions above
            [2] Audit the entire contract (all ${allFunctions.length} functions)
            [3] Generate report from pass 1 findings only ( skip pass 2)
            `);

        let choice = "";
        while (!["1", "2", "3"].includes(choice.trim())) {
            choice = await ask(" Enter choice (1/2/3): ");
            if (!["1", "2", "3"].includes(choice.trim())) {
                console.log(" [!] Please enter 1, 2,or 3.");
            }
        }

        const modeMap = { "1": "flagged", "2": "all", "3": "skip " };
        return { mode: modeMap[choice.trim()] };
    } finally {
        r1.close();
    }
}

// Derive overall risk from findings

function deriveOverallRisk(findings) {
    const order = ["CRITICAL", "HIGH", "MEDIUM", "LOW", "INFORMATIONAL"];
    for (const level of order) {
        if (findings.some((f) => fseveroty === level)) return level;
    }
    return "SAFE";
}

