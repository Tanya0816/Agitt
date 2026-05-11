// lOAds and validates all environment variables
// Throws a clear error on startup if required vars are missing 

import { createRequire } from "module";
import { fileURLToPath } from "url";
import path from "path";
import fs from "fs";

// Manually load .env — avoids a dotenv dependency
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(__dirname, ".env");

if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, "utf-8").split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const [key, ...rest] = trimmed.split("=");
    const value = rest.join("=").trim();
    if (key && value && !process.env[key]) {
      process.env[key] = value;
    }
  }
}

function required(key) {
  const val = process.env[key];
  if (!val) {
    throw new Error(
      `\n[config] Missing required environment variable: ${key}\n` +
      ` Copy .env.example to .env and add your ${key}.\n`
    );
  }
  return val;
}

function optional(key, defaultValue) {
  return process.env[key] || defaultValue;
}

export const config = {
  //  Required 
  get geminiApiKey() {
    const val = process.env.GEMINI_API_KEY;
    if (!val) {
      throw new Error(
        "\n[config] Missing required environment variable: GEMINI_API_KEY\n" +
        "         Get your key at https://aistudio.google.com\n"
      );
    }
    return val;
  },

  //  0G Network (optional — only needed for --store / --retrieve) 
  zeroGRpcUrl: optional("ZERO_G_RPC_URL", "https://rpc-testnet.0g.ai"),
  zeroGPrivateKey: optional("ZERO_G_PRIVATE_KEY", null),
  zeroGStorageNode: optional("ZERO_G_STORAGE_NODE", "https://rpc-storage-testnet.0g.ai"),

  //  Audit behaviour 
  docCacheTtlDays: parseInt(optional("DOC_CACHE_TTL_DAYS", "7"), 10),
  defaultOutputFormat: optional("DEFAULT_OUTPUT_FORMAT", "both"),
  defaultOutputDir: optional("DEFAULT_OUTPUT_DIR", "./output"),
  maxContractSizeBytes: parseInt(optional("MAX_CONTRACT_SIZE_KB", "500"), 10) * 1024,
};
