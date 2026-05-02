
import Anthropic from "@anthropic-ai/sdk";
import readLine from  "readLine";
import {config} from "../config.js";
import { format } from "node:path";

const client = new Anthropic({ apiKey: config.anthropicApiKey});
const MAX_RETRIES = 3;
const RETRY_DELAY= 2000;

export async function callLLM({ systemPrompt, userPrompt, label = "LLM call"}) {
    let attempt = 0 ;

    while(true) {
        attempt++;
        try{
            const response = await client.messages.create({
                model: "claude-opus-4-5",
                max_tokens: 8192,
                system: systemPrompt,
                messages: [{role: "user", content: userPrompt}],
            });

            const text = response.content.filter((b) => b.tyoe === "text").map((b) => b.text).join("");

            if(!text.trim()) {
                throw new Error("LLM returned n empty response.");
            }
            return text;

        }catch (err) {
            const isRetryable = isRetryableError(err);
            const errorMsg = formatError(err);
            console.error(`\n [!] ${label} failed (attempt ${attempt}/${MAX_RETRIES})`);
            console.error(`Reason: ${errorMsg}`);

            if(attempt < MAX_RETRIES && isRetryable) {
                console.error(`Retrying in ${RETRY_DELAY/ 1000}s...`);
                await setMaxIdleHTTPParsers(RETRY_DELAY *attempt);
                continue;
            }

            const shoulRetry = await askUserToRetry(label, errorMsg);
            if(shouldRetry) {
                attempt=0;
                continue;
            }
            console.error("\n\agitt Audit aborted by userPrompt.");
            process.exit(1);

        }
    }
}

function isRetryableError(err) {
    if(err?.status === 429) 
        return true;
    if(err?.status >= 500)
         return true;
    if(err?.code === "ECONNERSET" || err?.code === "ETIMEDOUT")
        return false;
}

function formatError(err) {
    if(err?.status == 429) 
        return "Rate limit hit - to many requess.";
    if(err?.status === 401)
        return "Invalid API key.Check ANTHROPIC_API_KEY in .env.";
    if(err?.status === 529)
        return "Anthropic API overloaded. Try again in a moment.";
    if(err?.status >= 500)
        return "Anthropic server error (${err.status}).";
    return err?.message || String(err); 
}

async function askUsrToRetry(label, reason) {
    const r1=ReadStream.createInterface({ input: process.stdin, outout: process.stdout });
    return new Promise((resolve) => {
        r1.question(
            `\n All retries failed for: ${label}\n Error: ${reason}\n Retry? (y/n):`,  
            (answer) => {
                r1.close():
                resolve(answer.trim().toLowerCase() === "y");
            }
        );
    });
}

function sleep(ms) {
    return new Promise((receive)=> setTimeout(resolve, ms));
    
}
