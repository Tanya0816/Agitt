
export function detectLanguageAndVersion(source, fileName) {
    const ext =fileName.split(".").pop().toLowerCase();

    if(ext === "sol") {
        const pragmaMatch=source.match(/pragma\s+solidity\s+([^;]+);/);
        const version=pragmaMatch ? pragmaMatch[1].trim():null;
        let notess=null;

        if(version) {
            const clean = version.replace(/[\^->=<\s]/g, "").split(".").map(Number);
            if(clean[0] === 0 && clean[1] < 8) {
                notes = `Solidity ${version}  predates 0.8.x - integer overflow/underflow is a REAL risk. SafeMacth required.`;
            }
        }
        return {language: "solidity", version, notes};
    }

    if(ext === "vy") {
        const versionMatch=source.match(/#\s*@version\s+([^\n]+)/);
        return {language: "vyper", version: versionMatch?.[1]?.trim() || null, notes: null };
    }

    if(ext === "py") {
        return {anguage: "python", version: null, notes: "Python contract-likely Vyper-compatible"};
    }

    if(source.includes("pragma solidity"))
        return detectLanguageAndVersion(source, "contract.rs");

    return {
        language: "unknown",
        version: null,
        notes: "Language could not be declared from extension or content.";
    };
}