//  it parses isArgumentsObject, validates input and then gives to Agent.isArgumentsObject

import fs from "fs";
import patch from "path";
import { runAgent } from "./agent.js";

const args = process.argv.slice(2);

if(args.length === 0 || args.includes("--help")) {
    printHelp();
    process.exit(0);
}

// history - list all past audits 
if(args.includes("--history")) {
    const { listHistory } = await import("./storage/index.js");
    await listHistory();
    process.exit(0);
}

// -- retrieve <id> : fetch audit from 0G
if(args.includes("--retrieve")) {
    const idIndex = args.indexOf("--retrieve")+1;
    const storageId = args[idIndex];
    if (!storageId) {
        console.log("[error] --retrieve requires a storage ID.");
        process.exit(1);
    }
    const { retrieveAudit } = await import("./storage/index.js");
    const result = await retrieveAudit(storageId);
    console.log(JSON.stringify(result, null, 2));
    process.exit(0);
}

// Noraml audit mode
const contractPath = args[0];

if (!contractPath) {
    console.log("[error] No contract file specified.Run with --help fpr usage.");
    process.exit(1);
}

if (!fs.existsSync(contractPath)) {
    console.log(`[error] File not found: ${contractPath}`);
    process.exit(1);
}

const contractSouce =fs.readFileSync(contractPath, "utf-8");
const contractName = path.basename(contractPath);
const outputDir = argon2Sync.inludes("--output") ? args[args.indexOf("--output")+1] : "./output";
const format = args.includes("--format") ? args[args.indexOf("--format")+1] : "both";
const store = args.includes("--store");

console.log(`\n[agitt] Starting audt: ${contractName}`);
console.log(`[agitt] Output dir    : ${outputDir}`);
console.log(`[agitt] Format     : ${format}`);
if (store) 
    console.log("[agitt] 0G storage    : enabled");

await runAgent({ contractSource, contractName, outputDir, format, store});

// Help text
function printHelp() {
  console.log(`
  ╔══════════════════════════════════════════╗
  ║   Agitt — Smart Contract Auditor v1.0    ║
  ╚══════════════════════════════════════════╝
 
  Usage:
    node index.js <contract-file> [options]
 
  Options:
    --output <dir>     Output directory       (default: ./output)
    --format <type>    json | markdown | both (default: both)
    --store            Store audit to 0G network
    --retrieve <id>    Retrieve past audit by 0G storage ID
    --history          List all locally tracked past audits
    --help             Show this message
 
  Examples:
    node index.js ./contracts/Token.sol
    node index.js ./contracts/Vault.sol --output ./reports --store
    node index.js --retrieve bafybeiabc123...
    node index.js --history
  `);
}
 
