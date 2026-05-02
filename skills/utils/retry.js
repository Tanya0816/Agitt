
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



