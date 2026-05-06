Rust Smart Contract Security Reference (Solana/ Cosm Wasm )

Solana/ Anchor Key Risks :

1. Missing Signer Checks 
// WRONG — no signer check
pub fn withdraw(ctx: Context<Withdraw>, amount: u64) -> Result<()> { ... }

// CORRECT — constrain who can call
#[derive(Accounts)]
pub struct Withdraw<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,  // must sign the transaction
}

2. Account Ownership not validated
   Alwaysverify account.owner == expected_program_id before trusting account data.

3. Missing Rent-Exempt Checks
   Accounts that fall below rent-exempt threshold can be garbage collected mid-operation.

4. Arithmetic Overflow
   Rust panics on overflow in debug mode but wraps in release mode. Always use checked_add, checked_sub, checked_mul for untrusted values :

   let new_balance = balance.checked_add(amount).ok_or(ErrorCode::Overflow)?;

5. Sealevel Attack Vectors (Solana-specific)
    a. Account confusion -two acocutns of same type, wrong one passed .
    b. Arbitrary CPI — calling user-supplied program address
    c. PDA seed collisions — predictable seeds allow address squatting
    d. Missing close constraint — leaving zombie accounts

6. CosmWasm Key Risks
    a. Reentrancy is impossible within a single message but cross-contract calls via SubMsg need careful reply handling.
    b. Integer overflow — use Uint128 / Uint256 from cosmwasm_std which check on overflow.
    c. Unauthorized execute entry points — always check info.sender.

    