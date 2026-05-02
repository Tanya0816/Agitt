
export function buildTriagePrompt({ contractSource, contractName, language, version, skills}) {
    const vulnList = skills.vulnerabilities
    .map((v) => '- **${v.name}**: ${v.desription}').join("\n");

    const systemPrompt = `An expert smart contract contract auditor.
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
      "name": "string}]
    }
`;

}