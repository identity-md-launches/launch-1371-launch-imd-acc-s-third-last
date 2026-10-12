# Adaptation for the Sepolia test run 3 launch

imd/acc's third and last Sepolia test run deploys one contract, `ProjectRegistry`, through
IdentityMD's `evm_contracts` factory, wired to test run 2's live Stacker and to Intake v2. This
file lists what was checked and what changed in this repository for that launch, and why. The
manifest (`launch.json`) was already in the tree as the requester wrote it and is not changed
here; it lists exactly the agreed arguments.

## Contracts: no change

`src/ProjectRegistry.sol` and `src/oracle/OracleAttestation.sol` are deployed as they arrived, as
the brief requires. They already meet every launch rule, checked as follows:

| Rule | Where it holds |
| --- | --- |
| Nonpayable constructor, static argument types, at most 16 arguments, no initializer or proxy | `ProjectRegistry` takes 7 arguments (4 `address`, 2 `uint256`, 1 `uint64`); everything else is a constant. |
| Constructor makes no external call and needs no address to have code | It only stores its arguments and rejects zero addresses and a cooldown over 365 days. `test/Deployment.t.sol` deploys it on an empty chain. |
| No owner, admin, `msg.sender` or `tx.origin` role | The contract has no owner and no privileged function; `owner()` does not exist (`test/Deployment.t.sol`, `test/FactoryRehearsal.t.sol`). |
| No minting, pausing, freezing, seizing, DELEGATECALL, CALLCODE, SELFDESTRUCT, upgradeability | The runtime (22,294 bytes, under EIP-170) is scanned for 0xf2, 0xf4 and 0xff outside push data in `test/Deployment.t.sol`; no such opcode. |
| Internal library functions only | `OracleAttestation` is a library of `internal` functions; `Strings`, `SafeERC20` and `ECDSA` are `internal` too, so the bytecode is linked. |
| Oracle protocol (struct, type string, domain, selectors, panel checks) | `src/oracle/OracleAttestation.sol` is the reference's library and consumer, differing only in formatting and in `_verifyAttestation`, which tries ECDSA before the ERC-1271 fallback (the project's EIP-7702 hardening, kept as the brief asks). `test/OracleConsumerConformance.t.sol` reproduces the protocol's digest and accepts the protocol's signature. `onOracleResult` is `0x510379c7`, `onOracleFailure` is `0xa7980e31`. |
| Questions and rules within the oracle's limits | All 8 version-2 rules are under 512 bytes and the question under 2,000 at maximum inputs (`test/ProjectRegistry.t.sol`, `test/RegistryBodyProperties.t.sol`). |

The one fix from the first attempt's audit (job 6478f77c), a beneficiary handoff at most once per
`HANDOFF_INTERVAL` (1 day), is already in `src/ProjectRegistry.sol` (`setBeneficiary`,
`HandoffTooSoon`, `handoffOpenAt`) and covered by `test/RegistryHandoffInterval.t.sol` and
`test/RegistryRevisionRegression.t.sol`. Nothing is added to `.github/workflows`.

## The audit of the code as it arrived

**4bc1aedb (low): an application carries no bond, so one wallet can hold a project's single ask
slot for the oracle fee alone.** Reproduced: with the mock Intake, three refused applications by a
griefer cost it exactly three fees (1.5 test IMD), and the project's own `applyListing` reverts
`AskOpen` during each round. Not changed, as the audit itself suggests: an application bond would
change the agreed economics (honest applicants would post it, and someone would have to receive a
forfeited one), which is the owner's decision, and the brief fixes the registry's source for this
launch. The project loses nothing and is never mis-listed. Instead the cost and the bound are
pinned and documented:

- `test/RegistryApplicationSlot.t.sol` (new): every round costs the full fee; a refusal or a
  failure frees the slot at once; a round the writer never answers is cleared by anyone after
  `PENDING_EXPIRY` (1 day), and sooner once the Intake has completed it; refused terms never reach
  the listing that follows (fuzzed).
- `docs/design.md`, "Known limits": the one-day bound and why no bond is added.

**d882f910 (info): scope and coverage of the review.** Not a defect; nothing to change. Its two
noted gaps are left as they are: the ERC-1271 fallback is unreachable with the EOA oracle signer,
and the factory probe itself is rehearsed by the new test below.

## Changes in this repository

| File | Change | Why |
| --- | --- | --- |
| `test/Deployment.t.sol` | New `test_launchManifest_registryDeploysThroughFactoryOnEmptySepolia` and the test-only `Create2Probe`: reads the seven arguments from `launch.json`, appends them to the registry's init code, deploys through CREATE2 from a factory on an empty chain with Sepolia's id, checks the predicted address, the stored wiring (live Stacker, Intake v2, test IMD, signer, chain 1, 5e18, 3600), the runtime limits and the absence of an owner. | The launch kind's reference: the factory deploys the contract from its bytecode as built in one transaction on an empty chain. The existing rehearsals used retyped arguments; this one rehearses the manifest itself. |
| `test/RegistryApplicationSlot.t.sol` | New, 5 tests (one fuzzed). | Audit finding 4bc1aedb, reproduced and kept as a design limit; see above. |
| `docs/design.md` | The "Blocking by spam" known limit states the one-day bound and why no application bond is added. | Same finding; the audit's documented alternative. |
| `README.md` | A "Sepolia test run 3 (launching)" section in Deployments with the registry's row, address to be filled in once live. | The brief: add the registry's address as "Sepolia test run 3" once live. The address is not known before deployment, so the row names the manifest and leaves the address open. |
| `ADAPTATION.md` | This file. | Acceptance criteria. |

Not changed: `foundry.toml`, `remappings.txt`, `lib/`, `launch.json`, `src/`, `test/mocks`,
`test/trial`, `.github/`.

## Checks run

- `forge build` with the project's configuration (solc 0.8.26, cancun, 10,000 runs,
  `bytecode_hash = "none"`): clean.
- `forge test` with an empty environment: 170 tests pass offline, 8 fork tests skipped (178 in
  all).
- The 8 fork tests with `SEPOLIA_RPC_URL` and `ETH_RPC_URL` set to public nodes (Sepolia block
  11,897,092): all pass. The live Stacker `0x0457…314d` is this build; the real Intake v2 takes
  the registry's `requestWithFailure`, pulls exactly 0.5 test IMD, registers the failure hook
  `0xa7980e31`, and a signed listing answer settles in 99,889 gas.
- The registry's runtime as built here is 22,294 bytes, as the brief states.

Open items for the deployer, outside this task: verify the deployed registry on the Sepolia
explorer, fill its address into the README row, and point the test-run-2 site at it.
