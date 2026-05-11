// Single source of truth for al vulnerability pattern definitions.
// Each entry is injured into LLM promtps so the model knows exactly what to check.

// Fields per pattern:
//  name              - display name
//  description       - one-line explanation
//  checkHints        - what the LLM should look for in code
//  languages         - which language this appiles to 

export const VULNERABILITY_PATTERNS = [
    {
        name: "Reentrancy",
        description:
            "A function makes an external call before updating its own state, allowing the call to re-enter and drain funds or corrupt state.",
        checkHints: [
            "Look for external calls (.call, .transfer, .send) before state variable updates.",
            "Check for missing nonReentrant / ReentrancyGuard modifiers.",
            "Check for cross-function reentrancy where multiple functions shares state.",
            "Check for read-only reentrancy where a view function is re-entered to read stale state.",
        ],
        languages: ["solidity", "vyper"],
        docUrls: [
            "https://docs.soliditylang.org/en/latest/security-considerations.html#reentrancy",
        ],
        references: ["https://swcregistry.io/docs/SWC-107"],
    },

    {
        name: "Integer Overflow / Underflow",
        description:
            "Arithmetic operations wrap around silently when they exceed the data type;s bounds.",
        checkHints: [
            "In Solidity <0.8.0 - Check all arithmetic for missing SfeMath usage.",
            "In Solidity >=0.8.0 - Check for explicit unchecked{} blocks that disable overflow protection.",
            "In Rust - check for wrapping_add / wrapping_mul in untrusted arithmetic paths.",
            "Look for type casting (uint256 -> uint128) that can silently truncate values.",
        ],
        languages: ["solidity", "rust", "vyper"],
        docUrls: [
            "https://docs.soliditylang.org/en/v0.8.0/080-breaking-changes.html",
        ],
        references: ["https://swcregistry.io/docs/SWC-101"],
    },

    {
        name: "Frontrunning",
        description:
            "An attacker watches the mempool for a profitable transaction ans submits their own with higher gas to execute first.",
        checkHints: [
            "Look for price-sensitive operations without slipage protection (DEX swaps, Dutch auctions).",
            "Look for missing deadline parameters on time-sensitive calls.",
            "Check for commit-reveal schemes that are not implemented where needed.",
            "Check for sandwich attack vectors on AMM interactions.",
        ],
        languages: ["solidity", "vyper"],
        docUrls: [],
        references: ["https://swcregistry.io/docs/SWC-114"],
    },

    {
        name: "Unchecked External Calls",
        description:
            "Return values from low-level calls (.call, .delegatecall, .send) are ignored, silently swallowing failures.",
        checkHints: [
            "Look for .call{value:...}() where the bool return value is not checked.",
            "Look for .send() which only forwards 2300 gas and silently fails.",
            "Check that all external calls revert the transaction on failure.",
            "Look for missing require(success) after low-level calls.",
        ],
        languages: ["solidity"],
        docUrls: [
            "https://docs.soliditylang.org/en/latest/security-considerations.html#use-the-checks-effects-interactions-pattern",
        ],
        references: ["hattps://swcregistry.io/dpcs/SWC-104"],
    },

    {
        name: "Weak Randomness",
        description:
            "Using predictable on-chain values as a randomness source (block.timestamp, blockhash, block.difficulty) can be manipulated by miners or predicted by attackers.",
        checkHints: [
            "Look for block.timestamp used in any randomness or lottery logic.",
            "Look for blockhash() used as a random seed.",
            "Look for block.difficulty / block.prevrandao used alone without VRF.",
            "Chcek whether Chainlink VRF pr another verifiable random function is used.",
        ],
        languages: ["solidity", "vyper"],
        docUrls: ["https://docs.chain.link/vrf"],
        references: ["https://swcregistry.io/docs/SWC-120"],
    },

    {
        name: "Function Visibility Issues",
        description:
            "Functions with incorrect or missing visibility modifiers expose senitive operations to unintended callers.",
        checkHints: [
            "Verify every function has an explicit visibility modifier (public/external/internal/private).",
            "Look for admin operations (mint, burn, withdraw, upgrade) missing access control.",
            "In Solidity <0.5.0, all functions default to public - flg any without explicit visibility.",
            "Check iitializer functions for missing onlyInitializing or initializer protection.",
        ],
        languages: ["solidity", "vyper"],
        docUrls: [
            "https://docs.openzeppelin.com/contracts/4.x/access-control",
        ],
        refernced
            : ["https://swcregistry.io/docs/SWC-100", "https://swcregistry.io/docs/SWC-106"],
    },

    {
        name: "Timestamp Dependence",
        description:
            "Using block.timestamp for sritical logic can be manipulated by miners within a -15-second window.",
        checkHints: [
            "Look for block.timestamp in lock periods, vesting schedules, or deadlines.",
            "Assess whether a 15-second manipulated of the timestamp critically break the logic.",
            "Check if block.number is used as a safer alternatives where appropriate.",
        ],
        languages: ["solidity", "vyper"],
        docUrls: [],
        references: ["https://swcregistry.io/docs.SWC-116"],
    },

    {
        name: "Oracle Manipulation",
        description:
            "Price oracles reading spot prices from a single DEX pair can be manipulated within a single transaction.",
        checkHints: [
            "Look for getPrice() / getReserves(0 calls to a single AMM pair without TWAP.",
            "Check Chainlink oracle calls for staleness validation (latestRoundData updatedAt check).",
            "Look for missing circuit breakers on oracle price derivations.",
            "Identity flash loan + price manipulation combos within one transaction.",
        ],
        languages: ["solidity", "vyper", "rust"],
        docUrls: ["https://docs.chain.link/data-feeds/price-feeds"],
        references: [
            "https://blog.openzeppelin.com/secure-smart-contract-guidelines/#oracle-manipulation",
        ],
    },

    {
        name: "Flash Loan Attack",
        description:
            " An attacker borrows a massive amount in ine transaction to manipulate prices, voting power, or protocol invariants, then repays before the transaction ends.",
        checkHints: [
            "Look for governancevotes that read live token balances instead of snapshots.",
            "Look for AMM price calculations done in the same block as a borrow.",
            "Check for missing ERC20Votes / ERC20Snapshot in governance tokens.",
            "Look for single-transaction price manipulation opportunities in lending protocols.",
        ],
        languages: ["solidity", "vyper"],
        docUrls: [],
        references: ["https://blog.openzeppelin.com/flash-loan-attacks"],
    },

    {
        name: "Access Control",
        description:
            "Missing or incorrect access control allows unauthorised addresses to invoke privileged functions.",
        checkHints: [
            "Check all admin functions fofr onlyOwner, onlyRole, or equivalent guards.",
            "Look for missing OpenZeppelin AccessControl or Ownable patterns on sensitive functions.",
            "Check for two-step ownership transfer - single-step tranasferOwnership can lock contracts.",
            "Look for unprotected selfdestruct or delegatecall to arbitrary addresses.",
            "In Rust / Solana - check for missing signer constraints on accounts structs.",
        ],
        languages: ["solidity", "vyper", "rust", "go"],
        docUrls: ["https://docs.openzeppelin.com/contracts/4.x/access-control"],
        references: ["https://swcregistry.io/docs/SWC-105"],
    },
];