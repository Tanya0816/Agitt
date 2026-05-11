// Wraps 0G client calls and maintains a local audit-history.json index
// Usrs can list past audits without needing to remember root hashes.

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { upload, download } from "./0g-client.js";
 
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const HISTORY_FILE = path.join(__dirname, "audit-history.json");

// Public API

export async function storeAudit(report) {
  const payload = {
    _type:    "agitt-audit-report",
    _version: "1.0.0",
    ...report,
  };
 
  const storageId = await upload(payload);
 
  // Append to local history index
  const history = loadHistory();
  history.push({
    storageId,
    contractName: report.contractName,
    language:     report.language,
    overallRisk:  report.overallRisk,
    auditedAt:    report.auditedAt,
  });
  saveHistory(history);
 
  return storageId;
}

// Retrieve a past audit from 0G by its sotrage ID

export async function retrieveAudit(storageId) {
  const data = await download(storageId);
 
  if (data._type !== "agitt-audit-report") {
    throw new Error(`Unexpected stored object type: ${data._type}`);
  }
 
  return data;
}

// Print all locally tracked past audits to the terminal.
// Does not require 0G connection.

export function listHistory() {
  const history = loadHistory();
 
  if (history.length === 0) {
    console.log("\n[agitt] No audit history found. Run an audit with --store to begin tracking.\n");
    return;
  }
 
  console.log(`\n[agitt] Audit History (${history.length} record(s))\n`);
  console.log(
    "  " +
    "Contract".padEnd(30) +
    "Language".padEnd(12) +
    "Risk".padEnd(12) +
    "Audited At".padEnd(25) +
    "Storage ID"
  );
  console.log("  " + "─".repeat(110));
 
  for (const entry of history) {
    console.log(
      "  " +
      entry.contractName.padEnd(30) +
      (entry.language   || "—").padEnd(12) +
      (entry.overallRisk || "—").padEnd(12) +
      entry.auditedAt.padEnd(25) +
      entry.storageId
    );
  }
  console.log();
}
 
// History Helpers

function loadHistory() {
  if (!fs.existsSync(HISTORY_FILE)) return [];
  try {
    return JSON.parse(fs.readFileSync(HISTORY_FILE, "utf-8"));
  } catch {
    return [];
  }
}
 
function saveHistory(history) {
  fs.writeFileSync(HISTORY_FILE, JSON.stringify(history, null, 2), "utf-8");
}