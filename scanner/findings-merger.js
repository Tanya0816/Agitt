// it merges pass 1 and pass 2 findings 
// pass2 findings overrides pass1 if both pass1 and pass2 have same function 

const Severity_order = ["CRITICAL", "HIGH", "MEDIUM", "LOW", "INFORMATIONAL"];

const SWC_MAP = {
    "Reentrancy": { swc: "SWC-107", url: "https://swcregistry.io/docs/SWC-107" },
    "Integer Overflow / Underflow": { swc: "SWC-101", url: "https://swcregistry.io/docs/SWC-101" },
    "Frontrunning": { swc: "SWC-114", url: "https://swcregistry.io/docs/SWC-114" },
    "Unchecked External Calls": { swc: "SWC-104", url: "https://swcregistry.io/docs/SWC-104" },
    "Weak Randomness": { swc: "SWC-120", url: "https://swcregistry.io/docs/SWC-120" },
    "Function Visibility Issues": { swc: "SWC-100", url: "https://swcregistry.io/docs/SWC-100" },
    "Timestamp Dependence": { swc: "SWC-116", url: "https://swcregistry.io/docs/SWC-116" },
    "Oracle Manipulation": { swc: "SWC-136", url: "https://swcregistry.io/docs/SWC-136" },
    "Flash Loan Attack": { swc: "SWC-107", url: "https://swcregistry.io/docs/SWC-107" },
    "Access Control": { swc: "SWC-105", url: "https://swcregistry.io/docs/SWC-105" },
};

const REMEDIATION_TEMPLATES = {
    "Reentrancy":
        "Apply the Checks-Effects-Interactions pattern: update all state variables " +
        "before making any external calls. Add OpenZeppelin's ReentrancyGuard and " +
        "the `nonReentrant` modifier to this function. " +
        "Reference: https://docs.openzeppelin.com/contracts/4.x/api/security#ReentrancyGuard",

    "Integer Overflow / Underflow":
        "In Solidity >=0.8.0, overflow reverts by default — check for any `unchecked{}` " +
        "blocks wrapping this arithmetic and remove them unless intentional. " +
        "In Solidity <0.8.0, replace all arithmetic with OpenZeppelin SafeMath. " +
        "Reference: https://docs.openzeppelin.com/contracts/4.x/api/utils#SafeMath",

    "Unchecked External Calls":
        "Always check the bool return value of low-level `.call()`. " +
        "Pattern: `(bool success, ) = target.call{value: amount}(\"\"); require(success, \"Transfer failed\");` " +
        "Prefer OpenZeppelin SafeERC20 for token transfers. " +
        "Reference: https://swcregistry.io/docs/SWC-104",

    "Weak Randomness":
        "Replace block.timestamp and blockhash randomness with Chainlink VRF (Verifiable Random Function). " +
        "Reference: https://docs.chain.link/vrf/v2/introduction",

    "Access Control":
        "Add an access control modifier (onlyOwner or role-based via OpenZeppelin AccessControl). " +
        "For ownership transfer, use Ownable2Step instead of single-step transferOwnership. " +
        "Reference: https://docs.openzeppelin.com/contracts/4.x/access-control",

    "Frontrunning":
        "Add a deadline parameter and slippage tolerance to price-sensitive operations. " +
        "Consider a commit-reveal scheme for auction or lottery logic. " +
        "Reference: https://swcregistry.io/docs/SWC-114",

    "Timestamp Dependence":
        "Avoid using block.timestamp for logic where a 15-second manipulation window is significant. " +
        "Use block.number for relative time where precision matters. " +
        "Reference: https://swcregistry.io/docs/SWC-116",

    "Oracle Manipulation":
        "Use a TWAP (time-weighted average price) oracle instead of spot price. " +
        "If using Chainlink, validate freshness: check `updatedAt` from latestRoundData " +
        "is within an acceptable staleness threshold. " +
        "Reference: https://docs.chain.link/data-feeds/price-feeds",

    "Flash Loan Attack":
        "Use ERC20Votes or ERC20Snapshot for governance tokens so voting power is based on " +
        "snapshots, not live balances. Avoid reading token balances or prices within " +
        "the same transaction as a borrow. " +
        "Reference: https://docs.openzeppelin.com/contracts/4.x/api/token/erc20#ERC20Snapshot",

    "Function Visibility Issues":
        "Explicitly mark all functions with visibility modifiers (public/external/internal/private). " +
        "Restrict sensitive functions with onlyOwner or AccessControl roles. " +
        "Reference: https://swcregistry.io/docs/SWC-100",
};

function enrichRemediation(findings) {
    return findings.map(f => {
        const isTooShort = !f.remediation || f.remediation.trim().length < 60;
        if (isTooShort) {
            const template = REMEDIATION_TEMPLATES[f.vulnerabilityClass];
            if (template) f.remediation = template;
        }
        return f;
    });
}

function stampSWC(findings) {
    return findings.map(f => {
        const entry = SWC_MAP[f.vulnerabilityClass];
        if (entry) {
            f.swcId = entry.swc;
            // Add to references if not already there
            if (!f.references) f.references = [];
            if (!f.references.includes(entry.url)) {
                f.references.unshift(entry.url); // SWC goes first
            }
        }
        return f;
    });
}

export function mergeFindings(pass1Findings = [], pass2Findings = []) {
    const map = new Map();
    for (const finding of pass1Findings) {
        const key = dedupeKey(finding);
        map.set(key, finding);
    }

    for (const finding of pass2Findings) {
        const key = dedupeKey(finding);
        const existing = map.get(key);

        if (!existing) {
            map.set(key, finding);
        } else {
            const existingRank = Severity_order.indexOf(existing.severity);
            const newRank = Severity_order.indexOf(finding.severity);
            if (newRank <= existingRank) {
                map.set(key, finding);
            }
        }
    }

    const sorted = [...map.values()].sort((a, b) => {
        return Severity_order.indexOf(a.severity) - Severity_order.indexOf(b.severity);
    });
    return sorted.map((f, i) => ({
        ...f,
        id: `F-${String(i + 1).padStart(2, "0")}`,
    }));

    return stampSWC(sorted.map((f, i) => ({ ...f, id: `F-${String(i + 1).padStart(2, "0")}` })));
    enrichRemediation(findings);

}

function dedupeKey(finding) {
    const vulnClass = (finding.vulnerabilityClass || "unknown").toLowerCase().replace(/\s+/g, "-");
    const location = (finding.location || "unknown").toLowerCase().replace(/\s+/g, "-");
    return `${vulnClass}:: ${location}`;
}