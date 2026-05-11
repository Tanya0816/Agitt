//  it parses isArgumentsObject, validates input and then gives to Agent.isArgumentsObject

import fs from "fs";
import path from "path";
import { runAgent } from "./agent.js";

const args = process.argv.slice(2);

if (args.length === 0 || args.includes("--help")) {
    printHelp();
    process.exit(0);
}

// shared flags (apply to both file and stdinn modes)
const rawOutput = args.includes("--output") ? args[args.indexOf("--output") + 1] : "./output";
const outputDir = path.resolve(process.cwd(), rawOutput);
const format = args.includes("--format") ? args[args.indexOf("--format") + 1] : "both";
const store = args.includes("--store");

// history - list all past audits 
if (args.includes("--history")) {
    const { listHistory } = await import("./storage/index.js");
    await listHistory();
    process.exit(0);
}

// -- retrieve <id> : fetch audit from 0G
if (args.includes("--retrieve")) {
    const idIndex = args.indexOf("--retrieve") + 1;
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

// read contrct source from piped input
if (args.includes("--stdin")) {
    // detect if anything is actually piped in 
    if (process.stdin.isTTY) {
        console.error(
            "[error] --stdin flag used but no piped input detected.\n " +
            "Usage: cat MyContract.sol \ node index.js --stdin\n" +
            "echo '<souce>' \ node index.js --stdin --name MyContract.sol"
        );
        process.exit(1);
    }

    // optional: caller ccan specify a display name via name 
    const contractName = args.includes("--name") ? args[args.indexOf("--name") + 1] : "contract-stdin.sol";
    console.log('\n[agitt] Reading contract from stdin...');

    const contractSource = await readStdin();

    if (!contractSource.trim()) {
        console.error("[error] Stdin was empty. No contract source received.");
        process.exit(1);
    }
    console.log('[agitt] Received ${contractSource.length} bytes');
    console.log('[agitt] Contract name : ${contractName}');
    console.log('[agitt] Output dir : ${outputDir}');
    console.log('[agitt] Format : ${format}');
    if (store)
        console.log("[agitt] OG storage : enabled");
    await runAgent({ contractSource, contractName, outputDir, format, store });
    process.exit(0);

}

// Noraml audit mode
const contractPath = args[0];

if (!contractPath) {
    console.log(
        "[error] No input provided.\n" +
        "        File mode  : node index.js ./contracts/Token.sol\n" +
        "        Stdin mode : cat Token.sol | node index.js --stdin"
    );
    process.exit(1);
}

if (!fs.existsSync(contractPath)) {
    console.log(`[error] File not found: ${contractPath}`);
    process.exit(1);
}

const contractSource = fs.readFileSync(contractPath, "utf-8");
const contractName = path.basename(contractPath);


console.log(`\n[agitt] Starting audt: ${contractName}`);
console.log(`[agitt] Output dir    : ${outputDir}`);
console.log(`[agitt] Format     : ${format}`);
if (store)
    console.log("[agitt] 0G storage : enabled");

await runAgent({ contractSource, contractName, outputDir, format, store });

// stdin reader
function readStdin() {
    return new Promise((resolve, reject) => {
        let data = "";
        process.stdin.setEncoding("utf-8");
        process.stdin.on("data", (chunk) => { data += chunk; });
        process.stdin.on("end", () => resolve(data));
        process.stdin.on("error", (err) => reject(err));
    });
}

// Help text
function printHelp() {
    console.log(`
  ╔══════════════════════════════════════════╗
  ║   Agitt — Smart Contract Auditor v1.0    ║
  ╚══════════════════════════════════════════╝
 
  Usage:
    node index.js <contract-file> [options]
    cat <contract-file> | node index.js --stdin [options]
 
  Options:
    --stdin            Read contract source from piped stdin
    --name <filename>  Display name when using --stdin (default: contract-stdin.sol)
    --output <dir>     Output directory                 (default: ./output)
    --format <type>    json | markdown | both            (default: both)
    --store            Store audit to 0G network
    --retrieve <id>    Retrieve past audit by 0G storage ID
    --history          List all locally tracked past audits
    --help             Show this message
 
  Examples:
    node index.js ./contracts/Token.sol
    node index.js ./contracts/Vault.sol --output ./reports --format markdown
 
    cat ./contracts/Token.sol | node index.js --stdin
    cat ./contracts/Token.sol | node index.js --stdin --name Token.sol
    cat ./contracts/Token.sol | node index.js --stdin --store
 
    curl https://raw.githubusercontent.com/org/repo/main/Token.sol | node index.js --stdin --name Token.sol
 
    node index.js --retrieve 0xabc123...
    node index.js --history

  `);
}

