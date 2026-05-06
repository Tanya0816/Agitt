// This coordinates - re-exoports the scanner pass functions under a unified API.

export { runPass1Triage as triageContract } from "./scanner/pass1-triage.js";
export { runPass2Deep as deepAuditFunction } from "./scanner/pass2-deep.js";
export { mergeFindings } from "./scanner/findings-merger.js";
export { parseAllFunctions } from "./scanner/function-parser.js";
 


