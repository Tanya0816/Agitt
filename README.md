# Agitt

LLM-powered smart contract security auditor with 2-pass scanning, runtime doc fetching, and 0G Labs decentralised storage.

What It Does
Agitt audits smart contracts written in Solidity, Vyper, Rust, Go, and Python. It runs a 2-pass scan:

Pass 1 — Triage: The LLM reads the full contract and identifies which functions carry the highest risk, without doing a deep dive yet.
User checkpoint: Agitt shows you the flagged functions and asks y/n to proceed. If you say n, you get three options: audit only risky functions, audit the entire contract, or generate a report from pass 1 only.
Pass 2 — Deep audit: The LLM audits each flagged function individually against 10 known vulnerability classes, using live-fetched and locally cached documentation.

Completed reports are written as .json and .md files. They can optionally be stored to the 0G Labs decentralised network for a permanent, verifiable audit trail.
