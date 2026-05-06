Solidity Language Security Reference

Compiler Version Risks

 1. <0.8.0 — no built-in overflow protection. All arithmetic needs SafeMath or manual checks.
 2. >=0.8.0 — overflow/underflow reverts by default. unchecked{} blocks opt out.
 3. <0.6.0 — no abstract, no try/catch, no receive(). Fallback handles everything.
 4. Always pin exact compiler version in production: pragma solidity 0.8.20; not ^0.8.0.
   
Checks-Effects-Interactions Pattern 
Always update state BEFORE making external calls.

// WRONG
function withdraw(uint amount) external {
    token.transfer(msg.sender, amount); // external call first
    balances[msg.sender] -= amount;     // state update after — reentrancy risk
}

// CORRECT
function withdraw(uint amount) external {
    balances[msg.sender] -= amount;     // state update first
    token.transfer(msg.sender, amount); // external call after
}

Common Dangerous Patterns

1. tx.origin for auth — use msg.sender instead.
2. block.timestamp for randomness — manipulable by miners ±15s.
3. delegatecall to user-supplied address — arbitrary code execution.
4. selfdestruct — deprecated in EIP-6049, but still dangerous.
5. Single-step transferOwnership — use two-step (OZ Ownable2Step).

Safe External Call Patterns

// Low-level call — always check return value
(bool success, ) = target.call{value: amount}("");
require(success, "Transfer failed");

// Prefer SafeERC20 for token transfers
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
using SafeERC20 for IERC20;
token.safeTransfer(recipient, amount);