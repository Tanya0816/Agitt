
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
            const text = result.response.text();

            if (!text.trim()) throw new Error("Empty response.");
            return text;
        } catch (err) {
            // const isRetryable = isRetryableError(err);
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
