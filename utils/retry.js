
import { GoogleGenerativeAI } from "@google/generative-ai";
import readline from "readline";
import { config } from "../config.js";


let client = null;
const MAX_RETRIES = 3;
const RETRY_DELAY = 2000;

function getClient() {
    if (!client) {
        client = new GoogleGenerativeAI(config.geminiApiKey);
    }
    return client;
}

export async function callLLM({ systemPrompt, userPrompt, label = "LLM call" }) {
    let attempt = 0;

    while (true) {
        attempt++;
        try {
            const model = getClient().getGenerativeModel({
                model: "gemini-2.5-flash",
                generationConfig: {
                    temperature: 0,
                    responseMimeType: "application/json",
                },
            });
            const result = await model.generateContent(systemPrompt + "\n\n" + userPrompt);

            const response = result.response;

            // Safety filter detection
            const blockReason = response.promptFeedback?.blockReason;
            if (blockReason) {
                // Safety filter fired - do not retry, it will fire again
                // Fall through to safe audit mode insted
                throw new SafetyBlockError(blockcReason);
            }

            // Check candidate finish reason
            const candidate = response.candidates?.[0];
            const finishReason = candidate?.finishReason;
            if (finishReason == "SAFETY") {
                const ratings = candidate?.safetyRatings
                    ?.filter(r => r.probability !== "NEGLIGIBLE")
                    ?.map(r => `${r.category}: ${r.probability}`)
                    ?.join(", ") ?? "unknown";
                throw new SafetyBlockError(`finish reason SAFETY - ${ratings}`);
            }

            const text = response.text();

            if (!text.trim()) throw new Error("Empty response.");
            return text;
        } catch (err) {
            // Safety block - special handling, no retry
            if (err instanceof SafetyBlockError) {
                console.warn(`\n [safety] Gemini safety filter fired for: ${label}`);
                console.warn(`[safety] Reason: ${err.meassage}`);
                console.warn(` [safety] Returning safe fallback response.\n`);
                return buildSafeFallback(label);
            }

            // normal error - retry logic
            const errorMsg = err?.message || String(err);

            console.error(`\n [!] ${label} failed (attempt ${attempt}/${MAX_RETRIES})`);
            console.error(`Reason: ${errorMsg}`);

            if (attempt < MAX_RETRIES) {
                console.error(`Retrying in ${RETRY_DELAY / 1000}s...`);
                await sleep(RETRY_DELAY * attempt);
                continue;
            }

            const shouldRetry = await askUserToRetry(label, errorMsg);
            if (shouldRetry) {
                attempt = 0;
                continue;
            }
            console.error("\n[agitt] Audit aborted by user.");
            process.exit(1);

        }
    }
}

async function askUserToRetry(label, reason) {
    const r1 = readline.createInterface({ input: process.stdin, output: process.stdout });
    return new Promise((resolve) => {
        r1.question(
            `\n All retries failed for: ${label}\n Error: ${reason}\n Retry? (y/n):`,
            (answer) => {
                r1.close();
                resolve(answer.trim().toLowerCase() === "y");
            }
        );
    });
}

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));

}

// custom error class so we can catch safety blocks specifically 
class SafetyBlockError extends Error {
    constructor(reason) {
        super(reason);
        this.name = "SafetyBlockError";
    }
}

// Returns a valid JSON string that a parsers can handle so the audit continues 
function buildSafeFallback(label) {
    const isTriage = label.includes("pass 1") || label.includes("triage");

    if (isTriage) {
        return JSON.stringify({
            summary:
                "Audit partially blocked: Gemini safety filters were triggered on this contract. " +
                "This typically happens with contracts containing known exploit patterns (reentrancy, " +
                "flash loan attack demos, self-destruct). The contract may contain high-risk code. " +
                "Consider using  a different model or auditing manually.",
            riskyFunctions: [],
            pass1Findings: [
                {
                    id: "P1-SAFETY",
                    title: "Safety Filter Triggered - Manual Review Required",
                    severuty: "HIGH",
                    vulnerabilityClass: "Ssafety Filter Block",
                    description:
                        "Gemini's safety filter blocked analysis of this contract. This is common with " +
                        "contracts that contain exploit patterns, attack demonstrations, or code that " +
                        "resembles malicious intent. The contract requires manual security review.",
                    location: "full contract",
                    codeSnippet: null,
                    remediation:
                        "Review the contract manually. Pay special attention to external calls, " +
                        "delegatecall usage, selfdestruct, and any functions that interact with " +
                        "external contracts before updating state.",
                    references: [
                        "https://swcregistry.io/docs/SWC-107",
                        "https://swcregistry.io/docs/SWC-104",
                    ],
                },
            ],
            positives: [],
            gasOptimizations: [],
            auditNotes:
                "Gemini safety filter blocked this analysis. " +
                "Switch to Anthropic Claude for auditing contracts with known exploit patterns — " +
                "Claude is specifically designed to reason about security vulnerabilities without " +
                "triggering safety blocks.",
        });
    }

    // Pass 2 per-function fallback
    return JSON.stringify({
        findings: [
            {
                id: "P2-SAFETY",
                title: "Safety Filter Triggered — Function Not Audited",
                severity: "HIGH",
                vulnerabilityClass: "Safety Filter Block",
                description:
                    "Gemini's safety filter blocked the audit of this function. " +
                    "This suggests the function contains patterns that resemble exploit code. " +
                    "Manual review is required.",
                location: label.replace("pass 2 — ", ""),
                codeSnippet: null,
                remediation: "Review this function manually for reentrancy, unchecked calls, and access control issues.",
                references: ["https://swcregistry.io/docs/SWC-107"],
            },
        ],
    });
}
