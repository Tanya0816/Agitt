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
            "In Solidity >=0.8.0 - Check for explicit unchecked{} blocks that disable overflow protection."
        ]
    }

]