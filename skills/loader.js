// Loads vulnerability patterns and documentation for  given language.

 
import fs  from "fs";
import path from "path";
import https from "https";
import http  from "http";
import { fileURLToPath } from "url";
import { VULNERABILITY_PATTERNS } from "./patterns.js";
import { config } from "../config.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CACHE_DIR = path.join(__dirname, "docs-cache");
const MANIFEST = path.join(CACHE_DIR, "cache-manifest.json");
const TTL_DAYS = config.docCacheTtlDays;
const TTL_MS = TTL_DAYS * 24 * 60 * 60 * 1000;

// Public API

export async function loadSkills(language) {
  const lang = language.toLowerCase();
 
  // Filter patterns relevant to this language
  const relevant = VULNERABILITY_PATTERNS.filter((p) =>
    p.languages.includes(lang) || p.languages.includes("all")
  );
 
  ensureCacheDir();
  const manifest = loadManifest();
  let docsLoaded = 0;
  const docPieces = [];
 
  for (const pattern of relevant) {
    pattern.fetchedContent = [];
 
    for (const url of (pattern.docUrls || [])) {
      const content = await getDoc(url, manifest);
      if (content) {
        pattern.fetchedContent.push({ url, content });
        docPieces.push(`## ${pattern.name} — ${url}\n\n${content.slice(0, 1500)}\n`);
        docsLoaded++;
      }
    }
  }
 
  saveManifest(manifest);
 
  // Also attach static lang-ref if available
  const langRef = loadLangRef(lang);
  if (langRef) {
    docPieces.unshift(`## ${lang} Language Reference\n\n${langRef.slice(0, 2000)}\n`);
  }
 
  return {
    vulnerabilities: relevant,
    docsLoaded,
    fetchedDocs: docPieces.join("\n---\n\n"),
  };
}

// Cache logic

async function getDoc(url, manifest) {
  const entry = manifest[url];
 
  if (entry) {
    const age = Date.now() - new Date(entry.fetchedAt).getTime();
    if (age < TTL_MS) {
      // Cache hit — read from disk
      const filePath = path.join(CACHE_DIR, entry.file);
      if (fs.existsSync(filePath)) {
        return fs.readFileSync(filePath, "utf-8");
      }
    }
  }
 
  // Cache miss or stale — fetch from web
  try {
    process.stdout.write(`  ↳ Fetching doc: ${url} ... `);
    const content = await fetchUrl(url);
    const cleaned = stripHtml(content).slice(0, 8000); // cap at 8kb per doc
    const fileName = urlToFileName(url);
    const filePath = path.join(CACHE_DIR, fileName);
 
    fs.writeFileSync(filePath, cleaned, "utf-8");
    manifest[url] = { file: fileName, fetchedAt: new Date().toISOString() };
 
    process.stdout.write(`cached (${(cleaned.length / 1024).toFixed(1)}kb)\n`);
    return cleaned;
  } catch (err) {
    process.stdout.write(`failed (${err.message}) — skipping\n`);
    return null;
  }
}

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    const lib      = url.startsWith("https") ? https : http;
    const timeout  = 10000;
 
    const req = lib.get(url, { headers: { "User-Agent": "Agitt/1.0 audit-bot" } }, (res) => {
      // Follow up to 2 redirects
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetchUrl(res.headers.location).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`HTTP ${res.statusCode}`));
      }
 
      let data = "";
      res.setEncoding("utf-8");
      res.on("data", (chunk) => { data += chunk; });
      res.on("end",  () => resolve(data));
    });
 
    req.setTimeout(timeout, () => { req.destroy(); reject(new Error("Timeout")); });
    req.on("error", reject);
  });
}
 
// Converts fetched HTML to readable text 

function stripHtml(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi,  "")
    .replace(/<nav[\s\S]*?<\/nav>/gi,      "")
    .replace(/<header[\s\S]*?<\/header>/gi,"")
    .replace(/<footer[\s\S]*?<\/footer>/gi,"")
    .replace(/<[^>]+>/g,                   " ")
    .replace(/&amp;/g,  "&")
    .replace(/&lt;/g,   "<")
    .replace(/&gt;/g,   ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g,  "'")
    .replace(/\s{3,}/g, "\n\n")
    .trim();
}
 
// Manifest helpers 

function loadManifest() {
  if (fs.existsSync(MANIFEST)) {
    try { return JSON.parse(fs.readFileSync(MANIFEST, "utf-8")); }
    catch { return {}; }
  }
  return {};
}
 
function saveManifest(manifest) {
  fs.writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2), "utf-8");
}
 
function ensureCacheDir() {
  if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR, { recursive: true });
}
 
function urlToFileName(url) {
  return url.replace(/https?:\/\//, "").replace(/[^a-zA-Z0-9]/g, "_").slice(0, 80) + ".md";
}
 
// Static lang-ref loader

function loadLangRef(lang) {
  const refPath = path.join(__dirname, "lang-refs", `${lang}.md`);
  if (fs.existsSync(refPath)) return fs.readFileSync(refPath, "utf-8");
  return null;
}
 
