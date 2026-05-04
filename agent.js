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
import { parseAllFunction, parseAllFunctions } from "./scanner/function-parser.js";
import { mergeFindings } from "./scanner/function-merger.js";

export async function runAgent({ contractSource, contractName, outputDir, format, store }) {
    const startTime = Date.now();
// Detect language and version 
    console.log("\n[step 1]Detecting language and version..." );
    const { language, version, notes }=detectLanguageAndVersion(contractSource, contractName);
    console.log(` Language: ${ language}`);
    console.log(` Version: ${version || "unknown"}`);
    if(notes)
        console.log(`Note: ${notes}`);
// load skills neede for auditing
    console.log("\n[step 2] Loading skills and fetching documentation...");
    
// parse function from source
    console.log("\n[step 3] Parsing contract functions...");
    const allFunctions=parseAllFunctions(contractSource, language);
    console.log(` Found ${allFunctions.length} function(s)`);

// pass 1-triage scan
 console.log("\n[pass 1/2] Running triage scan...");
 const triageResult = await runPass1Triage({contractSource, contractName, language, version, skills});
 console.log(`\n LLM idetified ${triageResult.riskyFunctions.length} risky function(s):\n`);
 triageResult.riskyFunctions.forEach((fn, i) => {
    const reasons= fn.reasons.join(",");
    console.log(` ${i+1}. ${fn.name.padEnd(25) - ${reasons}`);
 });

//  step 5- User checkpoint
}

