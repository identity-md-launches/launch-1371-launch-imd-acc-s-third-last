# imd/acc history

What happened so far, oldest first, with the checks behind each step. Moved here from the shared `HANDOFF.md` in `khaed1/claude`.

## 1. Sepolia launch (2026-10-09)

- **Job:** `640b4951-f512-4415-ab2e-944462a2f5ba`, launch #1129 (`8e1fcd97-a3ff-4f90-adb8-3dc15b2dc2f1`), prompt [`jobs/1-sepolia-launch.md`](../jobs/1-sepolia-launch.md) with owner `0x4b91…6821`. All 8 steps were accepted: build, tests, manifest, four audits and the judge, an independent review and reproducible bytecode. Code: [launch-1129 repository](https://github.com/identity-md-launches/launch-1129-build-imd-acc-sepolia-test), commit `934fb404`.
- **Parked first.** IMD's preflight estimated 23,701,870 gas, over the 16,777,216 per-transaction cap (EIP-7825). That was IMD's Sepolia deploy path, not the code: a real deploy of all three contracts costs 3,082,437 gas. The IMD dev unparked it.
- **Live** at block 11,874,601 (tx `0x9512b5df4f5711989f0436343d14bf30cd2e9d664d43aedfc6a4c1845fe4c0f0`, 23,509,044 gas):
  - TestIMD `0x2b69099e59b05901faa1dd164fabf098bf831e82`
  - TestSIMD `0xf9e2eec3b610ec6781f7438ac5fb4bc049d81cc1` (owner `0x4b91…6821`)
  - Stacker `0x293c7134ab8f6bf1d8ff44ed806575f8f1baf477`
- **Verified on chain:** the runtime code equals our build (TestIMD exactly; TestSIMD and the Stacker once their immutables are masked), the immutables point at the right contracts, and the Stacker's max allowance to the vault is set.
- **Independent check, all clean:**
  - Rebuilt with forge 1.8.3 (the verifier's version): all three contracts reproduce the attested creation and deployed bytecode exactly.
  - All 76 tests pass, including invariants and fuzzing.
  - TestSIMD's logic is identical to the live StakedIMD; only the name, symbol and pragma differ. The vendored Solady files are byte-identical to the vault's verified sources, and the OpenZeppelin files are identical to the official v5.1.0 release.
  - Slither's 7 results are all expected: strict equalities (the one-block hold, the faucet's never-used check), timestamps (the 24h faucet), and state written after the vault call in `credit`, which `nonReentrant` and the fixed, trusted token and vault cover.

## 2. Test page (2026-10-09)

- **Job:** `5530dde0-f0f2-45c2-b18d-ea718fc458de` (`job.continue`, skill `build-website`), prompt [`jobs/2-sepolia-site.md`](../jobs/2-sepolia-site.md). Delivered as PR #2, commit `7de7d635`; Vite + TypeScript in `site/`, built into `dist/`, with `config.json` and `projects.json` read at run time.
- **Hosted** at https://imd-acc-sepolia-test-run.site.identitymd.eth.limo (CID `bafybeic2skjuhsi5le5kt4sfya7sitdbn4g2jpctfzosxjdvt45iuxwyr4`). IMD named it `imd-acc-sepolia-test-run`, not the requested `imd-acc-test`.
- **Tested on a local Sepolia fork** with the delivered `dist/` and a scripted wallet: connect, faucet, the 24h cooldown, approve + credit, then the stack, tsIMD and its value, recent stacks and vault totals all updated. A listed project's credit earns points; self-stacks show "direct, no points"; a `fromBlock` after the credit gives 0 points. All 19 hard-coded selectors match the contracts. No page errors, no horizontal scroll at 360 px.
- **Live Sepolia test** with the owner wallet:
  - faucet tx `0x23a62183…94bb`: 10,000 tIMD; a second call reverts with `FaucetCooldown`
  - approve + `credit(self, 100 tIMD)` tx `0xaabe6a70…3252`: 100 tsIMD to the trader, a correct `Stacked` event and totals, the Stacker left with 0 tIMD and 0 tsIMD, and the one-block hold confirmed (redeemable 2 blocks later)
  - a second credit of 1 tIMD (tx `0x73580d51…0705`)
- **Sepolia gas is unusually high for new storage:** the first `credit` for a new trader used 1,161,856 gas, the second 182,644; the faucet 349,871; an approve 128k.
- The owner wallet's key was shared in chat for this test. It stays testnet-only.

## 3. PLEA, the first integration (2026-10-09 to 10-11)

PLEA is a sell-gated meme token on Uniswap v4 (its own repository, `khaed1/plea`). Its hook pays imd/acc cashback on every trade.

- **First PLEA test run** (launch #1148, hook `0x37337cd25f09a1cb77bba55d12358c9d00e2e8cc`): cashback was owed, then settled, then claimed by the trader, never paid at trade time. Three buys; their cashback reached the Stacker in two credits, 0.1026 tIMD. This hook stays unlisted.
- **Lesson from its site test:** the hook called `credit` only when `gasleft()` was above a reserve and paid plain tIMD otherwise. A wallet's gas estimate picks the cheapest path that succeeds, so normal wallets never got sIMD. **Rule for integrators:** check gas up front (revert if it's short) instead of letting the amount of gas choose a path without cashback.
- **PLEA v10** fixed both: its hook `0x3d4CcAc329010b8beA3b14498d9a45EAB00c68Cc` (deployed at block 11,885,872, tx `0x1379a47d…a00c`) credits the cashback **inside the same swap**, and checks at the start of `beforeSwap` that the swap has the credit gas (1.3M on Sepolia) plus a 1M reserve.
- **Live results:** buy A, 20 tIMD: 0.0596 tIMD stacked in the same swap. Buy B: the first cashback for a new wallet, 0.0936 tIMD. Two approved sells added 0.0093 and 0.0050 tIMD (PLEA pays cashback on sells too).
- **Sepolia gas under the new schedule:** a first credit to a new trader estimates about 698k gas, a repeat about 229k; approvals to a new spender 100k–130k. Wallets should use estimates ×1.3.

## 4. imd/acc gets its own session (2026-10-11)

- **Live state** at Sepolia block 11,889,292: 101.27 tIMD stacked in total, 0.1674 of it from PLEA v10's hook in 4 credits (traders `0x4b91…6821` and `0x0c85…7b7b`), vault open.
- **Listing PLEA:** [`jobs/3-list-plea.md`](../jobs/3-list-plea.md) is ready. Tested before paying: the delivered `dist/` with PLEA in `projects.json`, served locally in Chromium against live Sepolia. PLEA is listed, its 4 stacks marked "listed", top stackers `0x0c85…7b7b` (0.1 points) and `0x4b91…6821` (0.06), PLEA 0.1674 tIMD from 2 traders, no console errors, no overflow at 360 px. `/requests/check`: no blockers.
- **publicnode prunes old logs:** `eth_getLogs` from block 11,874,601 answers "pruned history unavailable" (code 4444). The page falls over to the next RPC; the listing job puts ethpandaops first. Scripts that read logs should use `https://rpc.sepolia.ethpandaops.io` or `https://sepolia.rpc.sentio.xyz`.
- **Mainnet:** [`jobs/4-mainnet-launch.md`](../jobs/4-mainnet-launch.md) is ready. IMD and sIMD were read on chain, and the exact Stacker was tested on a mainnet fork (see [design notes](design.md#ethereum-mainnet-ready-not-paid)). `/requests/check`: no blockers.
- **Intake v2** (`0xa43e6f75ee006411f79ac1c84120606c2330de82`, the same address on Ethereum, Sepolia and Robinhood Chain) was announced by the IMD dev. imd/acc only needs it for the future ProjectRegistry.
- **Moved** from `khaed1/claude` (`imd-acc/`) into this repository.

## 5. Lean mainnet Stacker and the multichain design (2026-10-11)

- **Decided in discussion:** the mainnet Stacker drops per-trader totals (points and the dashboard come from events); project points are the cashback a project paid, counted only for credits inside a swap on its pool; other chains use per-trader waiting balances delivered to Ethereum through IMD's own LayerZero bridge, paid by a tip of up to 2% rising over 12 hours. Details in [design notes](design.md#project-points-and-the-dashboard).
- **Mainnet Stacker written here** (`src/Stacker.sol`), with the launch-1129 tests adapted: per-trader checks now rebuild the figures from the events, the way the dashboard will. 42 tests pass; the 3 mainnet-fork tests pass against live IMD and sIMD.
- **Launch blocker avoided:** IMD rehearses constructors on an empty chain, where the mainnet IMD and sIMD have no code. The Sepolia constructor calls `sIMD.asset()` and would have reverted there. The mainnet constructor checks and approves only where the vault has code; `test/Deployment.t.sol` covers both cases.
- **Gas on a mainnet fork** (whole transactions): deploy 446,090; first credit ever 181,625; new trader 130,313; repeat trader 96,113. The Sepolia version measured 197k and 112k for the same calls.
- **IMD bridge facts** for the multichain route: OFT v2 linked to Arbitrum, Base and Robinhood Chain (eid 30416); compose supported, no message inspector; 6 shared decimals.
- The mainnet job ([`jobs/4-mainnet-launch.md`](../jobs/4-mainnet-launch.md)) now imports this repository instead of the launch-1129 one.

## 6. Sepolia test run 2 prepared (2026-10-11)

- **Plan (the user's):** test the new Stacker on Sepolia first, then PLEA's next version credits through it, then mainnet.
- **Reuses the live TestIMD and TestSIMD** of launch #1129: PLEA keeps the same tIMD, faucet balances carry over, the vault can still be paused for fallback tests, and only one contract is deployed.
- **Branch `sepolia`** (commit `03284ea`) differs from `main` only in `launch.json`. New `test/SepoliaFork.t.sol` passes against the live pair (credit, event, totals, paused-vault revert and recovery).
- **Two ready shapes**, both with no blockers at `/requests/check`:
  - `jobs/requests/5-sepolia-v2-workflow.json` (`workflow.open`): audit as it arrived, adapt, independent review, deploy, build and host a new test page (label `imd-acc-sepolia-v2`). It needed plain wording: "deploy one smart contract", what it does, and that publishing the site is approved and done by the platform, not the builders.
  - `jobs/requests/5-sepolia-v2-launch-only.json` (`launch.open`): the full audit panel, contracts only.
- **The new page reads `listings/sepolia.json` from this repository**, so listing PLEA's next hook there is a commit, not a paid job. The old listing job (`jobs/3-list-plea.md`, for the first page and PLEA v10) is no longer needed.

## 7. Cashback rate opened to 0.25%–1% (2026-10-11)

- **Decided:** each project picks its cashback rate between 0.25% and 1% (was a fixed 0.5%; PLEA keeps 0.5%). Points stay 1 per IMD stacked, so a higher rate gives traders more points.
- **Guard:** the part of a project's fee that really leaves it (liquidity, burns, prizes) must be at least its cashback, so self-trading for points always costs more than it returns. Listings state `rateBps`; the indexer flags credits that don't match it.
- **No contract change:** the Stacker stakes whatever amount it's sent. The README, design notes, explainer, session brief and the texts of jobs 4 and 5 were updated, and the requests re-checked.

## 8. Listing guide and the ProjectRegistry design (2026-10-11)

- **Listing today:** `docs/listing.md` (steps, checklist, the fee guard with PLEA's numbers, when points start, delisting with `toBlock`, per-credit checks) and a GitHub application form. The Sepolia run 2 site brief now honours `toBlock`.
- **ProjectRegistry:** designed in `docs/design.md` on Intake v2 (`0xa43e…de82`, code checked on Sepolia and mainnet; callback gas 1M on Sepolia, 200k on mainnet). `requestWithFailure` lets a refused or split panel clear the pending application at once; failures are unsigned, so they never list, delist or move value. No Stacker redeploy: the site and indexer read the registry instead of the file.
- **Next:** a Sepolia trial with PLEA's next version as the first applicant, plus negative cases, a no-answer case and a challenge.

## 9. ProjectRegistry built, in Sepolia test run 2 (2026-10-11)

- **Decided:** start the registry now, on the Sepolia test run, with PLEA's next version as the first applicant. Anyone may apply and challenge.
- **Built:** `src/ProjectRegistry.sol` on Intake v2 with `requestWithFailure`, reusing PLEA's attestation verifier (`src/oracle/OracleAttestation.sol`, reformatted only). Panel 15 seats, 11 agree; answers accepted only from the Intake, for its own open request, signed for this contract after the ask. A defended challenge pays the bond to the project's beneficiary; a lost one delists from that block and returns the bond; a failure or an expiry only clears the question and returns a bond.
- **Found while building:** the oracle refuses questions filed under Sepolia's chain id ("No RPC for chain 11155111"); Sepolia questions are filed under chain 1 and name Sepolia in the text, as PLEA's gate does. The question passed IMD's free check (no blockers, judged answerable). The beneficiary is part of the rules, so nobody can apply for another team's project with their own wallet.
- **Tests:** 23 unit and fuzz tests, an invariant suite (bonds held, records consistent, listing counts), and a Sepolia fork test against the real Intake v2: an application paid it and registered both callbacks (about 423k gas); a listing answer used 77k gas. All 68 tests pass.
- **Launch:** the `sepolia` branch's `launch.json` now deploys the Stacker and the registry (bond 5 test IMD, cooldown 1 hour); the test page brief reads the registry and has Apply and Challenge forms.

## 10. Registry settings confirmed, test run 2 approved (2026-10-11)

- **Confirmed by the owner:** panel 15 seats with 11 agreeing, open questions expire after 1 day; Sepolia bond 5 test IMD and cooldown 1 hour, as in the `sepolia` branch's `launch.json`. **Mainnet decided:** bond 20 IMD and cooldown 7 days, for the mainnet registry after the trial ([design notes](design.md#settings)).
- **Re-checked before paying:** all 68 tests and the 7 fork tests pass (mainnet, Sepolia and the real Intake v2); the three ready requests pass `/requests/check` with no blockers; the pinned commits (`724d1fc`, `e3e54a6`) carry the same code and job texts as the branches; Intake v2 still sells `oracle.request@oracle-1` for 0.5 test IMD (`0x44a1…f89a`) on Sepolia, and the oracle signer is still `0x5598…2982`.
- **Paid:** submitted through the imd.fun form ("My GitHub repository", commit `724d1fc`, Sepolia, no owner). The form opened a **`launch.open`** (contracts only, with the full four-specialist audit and judge), not the workflow, so it builds no test page. The page is a separate job after the launch: [`jobs/6-sepolia-v2-site.md`](../jobs/6-sepolia-v2-site.md), written to imd.fun's look (IBM Plex Mono and its colour tokens, square corners, light and dark) with compact text sizes and the Impeccable rules; imd.fun's light gray `#999` and light green `#1f9d55` fail AA for small text (2.9:1, 3.5:1), so the brief keeps gray for lines only and uses `#17804a` (5.0:1). As a `job.open` probe the text passed `/requests/check` with no blockers, and IMD plans `build-website` then a `design-critic` review. Order `832b34b4-0687-4de3-a7aa-62ae9dcd5d50`, payment tx `0xd9b8fb5c…e0b7`, job `0b69e5bd-873f-4bcf-9e02-ef1a00a4b2f5` (started 08:53 UTC).

## 11. Test run 2 launch job: IMD changed the contracts (2026-10-11)

- **Job `0b69e5bd`** (launch repository `identity-md-launches/launch-1294-deploy-two-smart-contracts`) finished its review at 10:25 UTC: import audit, adapt, manifest, tests, four specialist audits and a judge, then one revision round. Deployment comes next.
- **The judge's first round** kept eight findings: a medium one (the beneficiary could change the wallet a challenge names, by front-running `challenge` or during it, and collect the bond), and lows (an answer's request id never consumed; an unbounded cooldown could overflow; a challenge restated the application rate; a 1-wei credit stamps a trader's one-block hold), plus info items. The second round found every fix sound; three info items stay (the vault's one-block hold, one open question per project, TestSIMD's owner powers).
- **What IMD changed in `src/`** (so the Sepolia contracts differ from `main`):
  - Stacker: the constructor makes no external call; the first non-zero `credit` checks `sIMD.asset()` and approves the vault (a stored flag, about 2.1k gas more per credit).
  - ProjectRegistry: `ORACLE_FEE()` reads the Intake's live `priceOf` (checked on chain: 0.5 on Sepolia and mainnet); answers need `agreed >= quorum` too and each request id is consumed once; `setBeneficiary` is refused while a question is open, and after any handoff challenges must use `challengeForBeneficiary(project, reason, expectedBeneficiary)`; the cooldown is capped at 365 days; **a defended challenge no longer restarts the cooldown** (so a project can't buy immunity by challenging itself); **a challenge judges the current rate within 25-100 bps** and calls the application rate historical.
  - The adapt step also wrote a draft `site/` (plain JS); the site job replaces it.
- **Checked here:** IMD's final tree builds and all 157 tests pass, including the fork tests against live mainnet, the live Sepolia pair and the real Intake v2.

## 12. Sepolia test run 2 live (2026-10-11)

- **Launch #1294** (`9ee0316d-7266-4cf0-89aa-cff5f4f7610d`) went live at Sepolia block 11,891,109, tx `0x7a2d1e791756e5ce9a28408c8f141ccf6b669e824e54095d0328c31d364b9a60` (one transaction through IMD's factory, 39.8M gas). All admission checks passed (provenance, findings, independent review, reproducible bytecode, manifest, protected invariants).
  - Stacker `0x0457276d7b036818b3eddc1a4a3fceda61e9314d`
  - ProjectRegistry `0x3a3bfcb65614292b0ec7c62f9e3a5dac003b920e`
- **Checked on chain:** the delivered repository at `ef39dd18` is the same tree I tested (157 tests pass, forks included), and both contracts' runtime code equals that build once immutables are masked (Stacker 2,362 bytes, registry 20,725). Stacker: `IMD` = TestIMD, `SIMD` = TestSIMD, nothing stacked yet, no vault allowance until the first credit. Registry: Intake v2, fee token `0x44a1…f89a`, `stacker` = the new Stacker, signer `0x5598…2982`, `questionChainId` 1, bond 5e18, cooldown 3600, `ORACLE_FEE()` 0.5e18, panel 15/11, expiry 1 day. TestSIMD open, its asset TestIMD.
- **Website job** (`jobs/6-sepolia-v2-site.md`) passed `/requests/check` as a `job.continue` of the launch job, with no blockers, and was paid at 10:56 UTC: order `59b67d04-84cf-4cf1-aba6-ebb08f69f983`, job `a9afb834-83e0-43a4-97ca-1ecdfc6989b0`, the same text as the brief; IMD runs `build-website` then `design-critic`.

## 13. Test run 2 site live (2026-10-11)

- **Job `a9afb834`** (`build-website`, then IMD's `design-critic`) finished at 12:53 UTC. The reviewer's first pass found one bug (a 48-character project name pushed the page to 413px at 360px); the builder fixed it and the second pass was clean. Source: [PR #2](https://github.com/identity-md-launches/launch-1294-deploy-two-smart-contracts/pull/2) in the launch repository, commit `59fbaa8c`.
- **Hosted** at https://imd-acc-sepolia-test-run-2.sites.imd.fun/ (IMD named it `imd-acc-sepolia-test-run-2`, not the requested `imd-acc-sepolia-v2`; CID `bafybeicrrq6mkitrjpt2iurrdowyqo4e2ikhbu24wb5txuwotbsvabe7c4`). Its `.eth.limo` address did not answer yet.
- **Checked here in Chromium**, against live Sepolia for reads and a local Sepolia fork for transactions (the page's RPCs and an injected test wallet routed to the fork):
  - both pages at 360, 768 and 1280px in both themes: IBM Plex Mono, text 11-22px (18px max at 360px), no horizontal scroll, no console errors; the top bar stays one row at 360px, connected or not (items 32px, 13px text);
  - connect; faucet (10,000 test IMD, next claim time); approve and stack 100 (Your stack, Last 10 stacks update); get 10 oracle test IMD; approve the fee; the exact panel question shows; applying puts the project under Open questions and Projects (Applied, 0.5%);
  - the Challenge tab shows fee + bond (5.5) and the balance; the theme toggle is remembered after a reload; `/llms.txt` is served and matches the deployed contracts.
- **Small issues, for a later fix:** invalid Apply input (a quote in the name, an `http://` URL, a project that already has an open question) only disables the button, without saying which field is wrong; on wide screens the shorter boxes leave empty space beside the taller ones.

## 14. Rate changes allowed within the range (2026-10-11)

- **Decided by the owner:** IMD's Sepolia change stays: a challenge judges whether the rate in force is within 25-100 bps, not whether it equals the application rate. A listed project may change its rate inside the range.
- **Condition, for mainnet:** the panel's fee-guard wording adds that if the rate or the fee split can change, the code must keep the guard true for every allowed setting. Otherwise a project could raise its rate past its guard right after listing, during the cooldown.
- **Docs updated:** points count credits within 25-100 bps of their trade (not equal to the stated rate); changing the rate inside the limits is no reason to delist; the dashboard shows the measured current rate, with the application rate as historical.
- **Follow-up prepared (site):** the owner didn't like the single long app page. [`jobs/7-sepolia-v2-site-pages.md`](../jobs/7-sepolia-v2-site-pages.md) splits it into pages (Home, Stack, Projects with one page per project, Apply, Leaderboard, Docs with one route per section), with a Menu button below 860px so the top bar stays one row, and fixes the two issues above. It passed `/requests/check` with no blockers and was paid at 13:19 UTC: order `02824fca-d93c-4059-914e-b52c9d694c9c`, job `b874bae9-bf1c-4803-86ef-ce2e52b1bcab`, the same text as the brief.

## 15. Registry trial prepared (2026-10-11)

- **State at 13:30 UTC:** the registry had no application and the Stacker no credit. PLEA's `testnet` branch moved to the new Stacker at 13:21 (commit `4b2aed1`); its new hook isn't deployed yet. PLEA stays the first applicant: nothing is sent to the live registry before it applies.
- **Rehearsed on a local Sepolia fork:** a plain wallet is refused before any fee is taken (`NotAContract`); the negative-case contract applies normally (380k gas) and opens a question.
- **Negative case deployed** from the test wallet `0x4b91…6821`, approved by the owner: [`test/trial/SelfCredit.sol`](../test/trial/SelfCredit.sol), a contract with no trades whose owner credits its own test IMD to wallets it picks. Expected panel answer: no.
  - `SelfCredit` [`0x3d1778be5f9e55f0df35acaf64a13efe2fe81488`](https://sepolia.etherscan.io/address/0x3d1778be5f9e55f0df35acaf64a13efe2fe81488), block 11,892,114, tx `0xf6247bfce24c879fdd4b12399d7fa70e42add1386d5b66762e346a7a1d97bbf5`
  - funded with 10 tIMD (tx `0x7267250a12130f032f0560caf0804edd1f2ef6ff633bd4ded3b17f772c269e3a`), then `creditTo([0x4b91…6821], 1 tIMD)` (tx `0x2eb363a85acaca332aaa0b1d83bfa9949cb1840ff850c9639cde4e926c4a99f1`, block 11,892,116, 666,700 gas). This was the new Stacker's first credit, so it also checked the vault and set the vault approval once; 1 tIMD minted 1e24 tsIMD shares.
- **Source published on Sourcify** (shown on Blockscout), since the panel judges verified source: `SelfCredit` (full match), and the new Stacker (already a full match at 13:36, published by someone else). The registry was already verified. Etherscan's status can't be read without an API key. PLEA v10's hook shows on neither; the PLEA session verifies its new hook before applying.

## 16. Test run 2 site v2 live and checked (2026-10-11)

- **Job `b874bae9`** (`build-website`, then IMD's `design-critic`) finished at 14:27 UTC with no revision round. Source: [PR #3](https://github.com/identity-md-launches/launch-1294-deploy-two-smart-contracts/pull/3) in the launch repository, commit `cabef0ca`; contracts, tests and `launch.json` unchanged. Hosted at the same address, https://imd-acc-sepolia-test-run-2.sites.imd.fun/ (CID `bafybeiffq7wmu4ar6ezssb4hhb7ehdjpen4btqyfmuqpxayycytvazbyhq`); the `.eth.limo` address still fails TLS.
- **Pages:** Home `#/`, Your stack `#/stack`, Projects `#/projects` with one page per project `#/projects/<address>`, Apply `#/apply`, Leaderboard `#/leaderboard`, Docs `#/docs/<section>` (what, how, addresses, integrate, listing, points, agents), a not-found page, and `/llms.txt` as before.
- **IMD's reviewer:** 63 of 64 requirements met. One medium finding, marked non-blocking and left unfixed: a data refresh briefly removes the Apply form's panel question and a field's error (below).
- **Checked here in Chromium** with [`tools/site-check/`](../tools/site-check/README.md): reads from live Sepolia, transactions on a local fork through an injected test wallet.
  - **Layout:** every route at 360, 768 and 1280px in both themes, 90 cases on live Sepolia and 102 on a fork with a populated registry: no horizontal scroll or overflow, the top bar one row (54px at 360, 64px above, also when connected), the Menu button below 860px and the page links from 860px, text 11-22px (18px max at 360), scroll to top and focus on the h1 on every page change, titles like "Projects - imd/acc", the data block on every chain page, no axe (WCAG 2.1 AA) violations, no console errors.
  - **Navigation:** the menu opens and closes by click, outside click, Enter and Escape (focus returns to Menu); a menu link navigates and closes it; the open menu and the desktop links mark the current page (underline, `aria-current`); back and forward; deep links survive reload; the docs select below 860px and the side list from 860px; previous and next links; the footer links to Docs > Addresses; the theme choice is remembered; `/llms.txt` has both addresses.
  - **Wallet flows** on the fork, at 1280 and 360px, 45 checks each, all passed: connect; faucet with the next claim time; approve and stack 5 (Your stack, direct/no points, Leaderboard and the Home summary update); every transaction sent with gas at exactly 1.3 times the estimate; changing page never rescans logs, Refresh does; get test IMD, approve the fee and apply for `SelfCredit`, which then shows under Open questions and on its page (Applied, rate marked historical, the question's age and Expire); each field error with its reason in the alarm colour with `aria-invalid` and `aria-describedby` (not an address, no code, name too long, double quote, backslash, square bracket, the exact non-ASCII character, URL not https or too short, rate 20 or 101, zero beneficiary); "Already listed" and "This project already has an open question"; the Challenge form on a listed project with fee + bond (5.5), the cooldown end time, reason errors, then `challengeForBeneficiary`; the project filters.
  - **Registry states on the fork** (test signer, see the tool's README): a failure callback shows the question cleared; a yes to a challenge shows Defended; a second challenge right after the defended one was accepted (the deployed registry doesn't restart the cooldown) and a no delisted the project.
- **Small issues, not blocking the trial:**
  - The reviewer's finding, reproduced: each refresh (every 60s, every 15s while any question is open) briefly removes the Apply form's panel question, so the page shrinks by about 630px at 360px and jumps; a "no contract code" error loses its text and `aria-invalid` for a moment.
  - With the menu open, Tab reaches the theme and Connect buttons before the menu links.
