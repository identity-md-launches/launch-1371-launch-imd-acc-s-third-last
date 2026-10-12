# Additional contract tests

These tests extend the existing suite without changing application contracts, deployment
arguments, dependencies, or Foundry configuration. All new fixtures use chain ID 11155111 and
run without a fork, network access, FFI, environment writes, or files under `test/scratch`.

| File | Properties exercised |
| --- | --- |
| `RegistryAdversarial.t.sol` | Authentication of all 15 signed fields; chain-domain separation; malformed signatures and boolean answers; exact clock-tolerance, cooldown and expiry boundaries; unrelated paid requests; replay after replacement requests; recovery from a lost callback; beneficiary handover; rollback on payment and Intake errors. |
| `RegistryAccountingInvariant.t.sol` | Random calls across three projects and five actors, with independent expected balances and listing history. Tracks exact fees, bond recipients, donations, changing prices, retired actions, unauthorized calls, failures, expiry, and request consumption. Drains pending bonds after every campaign. |
| `RegistryBodyProperties.t.sol` | Generated valid text survives JSON encoding and decoding; every forbidden byte is rejected in all three input fields before payment; minimum, maximum and adjacent invalid lengths; paid-door body, question and definition limits; Sepolia consumer domain distinct from question-routing chain. |
| `RegistryHandoffInterval.t.sol` | The one-handoff-per-day rule of `setBeneficiary`: the exact opening time at any elapsed time (fuzzed), a third wallet refused like a move back, the earlier checks (not listed, question open, not the beneficiary, zero wallet) still first, an application naming a new wallet and an expired or failed question leaving the clock alone, a per-project clock, and the property the rule buys: inside the interval a challenge naming the wallet in force is always filed and charged once (fuzzed). |
| `StackerExternalCalls.t.sol` | Late vault errors and zero-share returns roll back actual transfers and mints; token reentrancy is rejected at approval and transfer boundaries; optional ERC-20 return data; isolation of caller allowances; differential comparison with a direct vault deposit from identical state. |
| `RegistrySepoliaRun3.t.sol` | Test run 3 as the manifest deploys it: the registry built from launch.json's own arguments on chain 11155111, with test doubles etched at the live Intake and test-IMD addresses. The fee is read live from the Intake address; the body routes to chain 1, names Sepolia, the live Stacker and this registry; the eight version-2 rules are compared verbatim with docs/panel-rules-v2.md; no other key (fuzzed), no other registry's or chain's signature, and no setter can stand in for the oracle signer; refusals, split panels, expiry and unlisted-project challenges with the Sepolia bond and cooldown. |
| `RegistrySignerAuthority.t.sol` | The branches of `_verifyAttestation`: a bare key has no contract path; high-s, EIP-2098 compact, zero-based v and every single-bit corruption (fuzzed) are refusals; a signer key with delegated code still settles by ECDSA; an ERC-1271 key registry accepts, rotates without redeploy, and reverting or malformed answers are refusals; an attacker's own ERC-1271 contract is never consulted; nothing on the registry changes the signer. |
| `RegistryPayoutEdges.t.sol` | A token that refuses the beneficiary fails the defence inside the Intake's try and `expire` returns the bond to the challenger; a blocked applicant is still listed; panels larger than asked are accepted and every panel-field boundary (fuzzed) refuses with WrongPanel; a zero-bond registry never transfers on settlement; two registries sharing a signer do not share answers or consumption. |

New fuzz tests use 1,000 runs. The accounting invariant uses 256 runs of depth 64 with
`fail-on-revert` enabled and an explicit selector list. Valid callbacks must succeed: an
unexpected callback failure is an assertion failure, rather than a silently discarded action.
A deterministic handler test exercises all payout outcomes and checks the model between
transitions. The existing Stacker value-conservation invariants and protocol signature-vector
tests remain in the suite.

The accounting model also tracks beneficiary pinning independently across handoffs and
relistings. Random calls attempt handoffs during open challenges, stale beneficiary pins,
and legacy challenges after a handoff, checking the precise rejection and unchanged ledger.
Deterministic campaigns cover returning to the original beneficiary and oracle retirement
after a handoff. Settlement tests verify each defended bond reaches the beneficiary named
when that challenge opened.

Run the full local checks with:

```sh
forge build --offline --out test/scratch/out --cache-path test/scratch/cache
forge test --offline --out test/scratch/out --cache-path test/scratch/cache
```

The output overrides keep generated artifacts inside the permitted scratch directory; they
are not required for the tests. Ordinary `forge test` uses the same tests and inline settings.

These checks exercise the application code against local token, vault and Intake fixtures.
They do not establish the current state of live Sepolia dependencies or prove that an off-chain
oracle panel will accept a question. Existing optional fork tests skip when their RPC settings
are absent. No new test skips or needs RPC configuration.
