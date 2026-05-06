Go Smart Contract Security Reference(Cosmos SDK/ Hyperledger)

Cosmos SDK Key Risks

Missing Authority Checks 
// Always validate msg.Authority against the module's governance address
if msg.Authority != k.GetAuthority() {
    return nil, errors.Wrapf(govtypes.ErrInvalidSigner,
        "invalid authority %s", msg.Authority)
}

Integer Overflow 
Go's int type wraps on overflow. Use sdk.Int / math.Int for token amounts
// WRONG
total := amount1 + amount2  // can overflow

// CORRECT
total, overflow := math.AddOverflow(amount1, amount2)
if overflow { return errors.New("overflow") }

Panics in message handlers
Any panic in a message handler aborts the block. Always recover or use safe helpers.

Determinism 
All state transitions must be deterministic. Avoid:

  1. map iteration (non-deterministic order in Go)
  2. time.Now() — use ctx.BlockTime() instead
  3. Random number generation without a seeded deterministic source
   
Store Key Collisions
Ensure all KV store keys are namespaced to avoid collision between modules.