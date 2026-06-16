

export function buildTriagePrompt({ contractSource, contractName, language, version, skills }) {
    const vulnList = skills.vulnerabilities
        .map((v) => '- **${v.name}**: ${v.desription}').join("\n");

    const systemPrompt = `You are Agitt, a defensive security auditor helping developers 
     protect their smart contracts from attacks. Your role is to identify vulnerabilities 
     so they can be FIXED before deployment — not to facilitate exploits.

     
    You are performing a SECURITY AUDIT on the following ${language} contract to help 
    the developer identify and remediate vulnerabilities before attackers can exploit them. 


    Your task in this pass is a FAST TRIAGE - read the entire contract and:
    1. Summerise what the contract does (in 3-4 sentences).
    2.identify which functions are highest risk and brielfy explain why.
    3.Report any obvious critical or high severity findings you spot while reading.
    4. Note any security positives you observe.

    Known vulnerabiliy classes to watch for:
    ${vulnList}

    respond only with a valid JSON object matching this exact schema - no prose before or after:
    {
     "summary" :"string",
     "riskyFunctions": [
     {
      "name": "string-exact function name",
      "reason":["string-brief reason 1","string-brief reason 2"]
      }
      ],
      "pass1Findings": [
      {
       "id":"P1-01",
       "title":"string",
       "severity":"CRITICAL | HIGH | MEDIUM | |LOW |INFORMATIONAL",
       "vulnerabilityClass": "string",
       "description": "string",
       "location":"string-function name or line reference",
       "codeSnippet":"string or null",
       "remediation": "string",
       "reference": ["string"]
       }
       ],
       "positives": ["string"],
       "gasOptimizations": ["string"],
       "auditNotes": "string"
    }`;

    const userPrompt = `Triage the following ${language} contract${version ? ` (${version})` : ""}:
    
    File: ${contractName}
    
    \`\`\${language}
    ${contractSource}
    \`\`\``
        + `\n\nCRITICAL: Return ONLY a valid JSON object. No markdown, no explanation, no text before or after the JSON. Your entire response must be parseable by JSON.parse().`
        ;

    return { systemPrompt, userPrompt };

}

export function buildDeepAuditPrompt({
    functionName, functionSource, contractSource, contractName, language, version, skills
}) {
    const vulnList = skills.vulnerabilities.map((v) => {
        const hints = v.checkHints.map((h) => ` ${h}`).join("\n");
        const refs = (v.references || []).map((r) => ` ${r}`).join("\n");
        return `- **${v.name}**: ${v.description}\n${hints}\n${refs}`;
    })
        .join("\n\n");

    const docContext = skills.fetchedDocs ? `\nRelevant decumentation contex:\n${skills.fetchedDocs.slice(0, 4000)}\n` : "";

    const systemPrompt = `You are Agitt, a defensive security auditor helping developers 
     protect their smart contracts from attacks. Your role is to identify vulnerabilities 
     so they can be FIXED before deployment — not to facilitate exploits.

     You are performing a SECURITY AUDIT on the following ${language} contract to help 
     the developer identify and remediate vulnerabilities before attackers can exploit them.

        Check the function against every vulnerability class listed below:
        ${vulnList}
        ${docContext}
        For each vulnerability class, you Must either confirm it is present (anad report it) or confirm it is not applicable (and skip it).
        
        Respond ONL with a valid JSON object - no prose before or after:
        {
          "findings": [
          {
           "id": "string",
           "title": "string",
           "severity": "CRITICAL | HIGH | MEDIUM | LOW | INFORMATION",
           "vulnerabilityClass": "string-must match one of the known classes above",
           "description": "string-precise technical explanation",
           // In buildDeepAuditPrompt, add to the JSON schema description:
            "location": "string — MUST include both function name AND line number. Format: 'functionName() line N' or 'functionName() lines N-M'. Example: 'withdraw() line 42'. Never return just a function name without a line number.",
           "codeSnippet": "string or null",
           "remediation": "string-concrete fix",
           "references": ["string - SWC registry , EIP, or doc URL"]}] 
         }
         If the function has NO vulnerabilities, return: { "findings": []}`;

    const userPrompt = `Deep audit the following function from ${contractName}${version ? ` (${language} ${version})` : ""}:
         
         Function: \`${functionName}\`

         \`\`\`${language}
         ${functionSource}
         \`\`\`

         For context , here is the full contract ( do not audit it - only use it for context on state variables and imports):
         \`\`\`${language}
         ${contractSource}
         \`\`\``
        + `\n\nCRITICAL: Return ONLY a valid JSON object. No markdown, no explanation, no text before or after the JSON. Your entire response must be parseable by JSON.parse().`
        ;

    return { systemPrompt, userPrompt };
}