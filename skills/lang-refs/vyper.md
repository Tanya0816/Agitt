Vyper Language Security Reference 

Key Properties : 
 
 1. Vyper has NO inheritance, NO function  overloading,   NO infinite loops by design.
 2. All arithmetic overflows revert by default (similar to Solidity 0.8+).
 3. @nonreentrant decorator provides reentrancy protection at the function level.
   
Common Vyper Risks 

Missing @nonreentrant

# WRONG — external call before state update
@external
def withdraw(amount: uint256):
    send(msg.sender, amount)        # external call
    self.balances[msg.sender] -= amount  # state after

# CORRECT
@external
@nonreentrant("withdraw")
def withdraw(amount: uint256):
    self.balances[msg.sender] -= amount  # state first
    send(msg.sender, amount)

Slice/ Range Bounds
Always validate indices when using slice() or range loops with user-supplied lengths.

Default Function
The __default__ function is called on plain ETH transfers — check it doesn't expose unintended logic.

Timestamp 
block.timestamp carries the same miner-manipulability risk as Solidity.