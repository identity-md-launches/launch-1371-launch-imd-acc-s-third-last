Repo: **`khaed1/imd-acc`** (code, tests, docs, IMD job prompts). If it isn't in your session, attach it with `add_repo` (push access). Branches: **`main`** = the mainnet manifest (`launch.json`: the Stacker only); **`sepolia`** = `main` plus a Sepolia `launch.json` (Stacker + ProjectRegistry). Work on `main`, then merge `main` into `sepolia` so they differ only in `launch.json`. The first Sepolia launch's code is at https://github.com/identity-md-launches/launch-1129-build-imd-acc-sepolia-test (reference only). `khaed1/claude`'s `HANDOFF.md` is PLEA's now; read it only for PLEA details.

You're working on **imd/acc**, a project I'm building on the IMD swarm (imd.fun). A separate session on my other account works on **PLEA**, imd/acc's first integration: don't change PLEA, use it as the live example.

## imd/acc in brief
Trading cashback paid in **staked IMD (sIMD)**, inspired by TokenWorks' btc/acc. A project sends **0.25%–1% of each trade** (its choice; PLEA uses 0.5%), out of fees it already charges, to the trader as sIMD through one shared, ownerless **`Stacker.credit(trader, imdAmount)`**: it pulls the IMD from the project and calls `sIMD.deposit(amount, trader)`, so the vault mints shares straight to the trader. No new token, no cut. Every `Stacked(project, trader, imd, shares)` event is a record; **points** = 1 per IMD stacked, counted only for **listed** projects inside their listing periods. Listing is decided by the ownerless **ProjectRegistry**: anyone applies or challenges, and an IdentityMD oracle panel answers yes or no (Intake v2).

## Read, in this order
1. `README.md`: overview, contracts, deployments, points, integration rules, roadmap.
2. `docs/design.md`: every decision, with the reasons. Key sections: cashback rate and fee guard; project points and the dashboard; **The ProjectRegistry**; multichain; who pays the gas; settings; open questions.
3. `docs/listing.md`: how a project gets listed (registry, or a list file where no registry runs yet).
4. `docs/history.md`: what happened, sections 1–9, with transactions and checks.
5. `src/Stacker.sol`, `src/ProjectRegistry.sol`, `src/oracle/OracleAttestation.sol`, and `test/`.
6. `jobs/` (IMD job prompts, numbered) and `jobs/requests/` (exact request bodies).

## Where we stopped (2026-10-11)
- **Sepolia test run 2 is live (launch #1294, block 11,891,109):** Stacker `0x0457276d7b036818b3eddc1a4a3fceda61e9314d`, ProjectRegistry `0x3a3bfcb65614292b0ec7c62f9e3a5dac003b920e`. Checked on chain (code equals the tested build, wiring and settings right). **Website job paid** (10:56 UTC): order `59b67d04-84cf-4cf1-aba6-ebb08f69f983`, job `a9afb834-83e0-43a4-97ca-1ecdfc6989b0` (`build-website`, then `design-critic`), checked every 30 minutes; when done, check the page in a browser. **Site live** (12:53 UTC): https://imd-acc-sepolia-test-run-2.sites.imd.fun/, checked in a browser (history section 13); two small UI fixes noted for later. The PLEA session has the handoff (addresses, crediting, applying); then the registry trial.
- **Live on Sepolia, launch #1129:** TestIMD `0x2b69099e59b05901faa1dd164fabf098bf831e82` (faucet 10,000 tIMD/24h), TestSIMD `0xf9e2eec3b610ec6781f7438ac5fb4bc049d81cc1` (owner `0x4b91…6821` can pause it), first Stacker `0x293c7134ab8f6bf1d8ff44ed806575f8f1baf477`, test page https://imd-acc-sepolia-test-run.site.identitymd.eth.limo. PLEA v10's hook `0x3d4C…68Cc` credits through that old Stacker (not listed; `jobs/3-list-plea.md` is obsolete).
- **Built and tested, not deployed:**
  - the lean Stacker: no per-trader totals on chain; per-trader figures and points come from events. Fork gas: new trader 130k, repeat 96k;
  - the ProjectRegistry.
  - 68 tests pass. The fork tests (`MainnetFork`, `SepoliaFork`, `RegistrySepoliaFork`, the last against the real Intake v2) run with `ETH_RPC_URL` / `SEPOLIA_RPC_URL` set.
- **Waiting for my OK to pay** (both pass `POST /requests/check` with no blockers):
  1. **Sepolia test run 2**, `jobs/requests/5-sepolia-v2-workflow.json` (`workflow.open`, branch `sepolia` at `724d1fc`): deploys the new Stacker and the ProjectRegistry on the live test pair, then a test page (label `imd-acc-sepolia-v2`) that reads the registry and has Apply/Challenge forms. Texts: `jobs/5-sepolia-v2-launch.md` and `jobs/5-sepolia-v2-site.md`. Alternative with IMD's full four-specialist audit (contracts only): `5-sepolia-v2-launch-only.json`.
  2. **Mainnet Stacker**, `jobs/requests/4-mainnet-launch.json` (`launch.open`, chain 1, `main` at `e3e54a6`): the Stacker only, with the full audit. It comes after the Sepolia trial.
- **Registry settings, confirmed by me (2026-10-11):** panel 15 seats / 11 agree, open question expires after 1 day; Sepolia bond 5 test IMD, cooldown 1 hour; mainnet bond 20 IMD (`20e18`), cooldown 7 days (`604800`).
- **Test run 2 paid (2026-10-11, 08:53 UTC):** through the imd.fun form from GitHub commit `724d1fc`. The form opened a `launch.open` (contracts only, full audit), not the workflow: order `832b34b4-0687-4de3-a7aa-62ae9dcd5d50`, job `0b69e5bd-873f-4bcf-9e02-ef1a00a4b2f5`. Check the job every 30 minutes. Review done 10:25 UTC, deployment next. **IMD changed both contracts** (see `docs/history.md` section 11): the Sepolia code differs from `main`. Still to decide with me: whether to bring those changes into `main` before the mainnet jobs, and two design changes (a defended challenge no longer restarts the cooldown; a challenge judges the current rate, not the stated one).
- **Test page job ready, not paid:** `jobs/6-sepolia-v2-site.md` (`job.continue` on the launch job, `build-website`; IMD adds a `design-critic` review; site label `imd-acc-sepolia-v2`; request `jobs/requests/6-sepolia-v2-site.json`). An app page and a docs page (integration, listing, points, and a copyable "For agents" block also served at `/llms.txt`), imd.fun's look (IBM Plex Mono, its colour tokens, square corners, light and dark), compact text sizes, and the Impeccable rules (impeccable.style). It can only be submitted once the launch job has finished; the text passed `/requests/check` as a `job.open` probe with no blockers. I submit it through the imd.fun form.

## Next, once I've paid for test run 2
1. Follow the order (`GET /requests/paid-by/0xf8ad3f88b0e0d177aa8c5e6be1e13410fd41cdc7`, then the workflow and job status). When it's live:
   - check the two contracts on chain (code matches our build, wiring, immutables, the registry's settings);
   - add both addresses to the README Deployments table, `docs/history.md` and this file;
   - once I've paid the test page job, check the page in a browser (both themes, 360/768/1280 px).
2. Give the addresses to the PLEA session. Its next version credits through the new Stacker and then calls `applyListing(hook, "PLEA", sourceUrl, 50, beneficiary)` after approving `ORACLE_FEE()` of the Sepolia test IMD; the beneficiary must be PLEA's owner or team wallet. Challenges use `challengeForBeneficiary`.
3. Run the registry trial (steps in `docs/design.md`, "Sepolia trial with PLEA"):
   - PLEA expected yes;
   - negative cases expected no;
   - a no-answer case clears the application;
   - a challenge PLEA should survive.
   Record the results.
4. After that: the mainnet Stacker (job 4), an indexer (IMD skill `build-ponder-indexer`) and the mainnet dashboard, the mainnet registry (bond 20 IMD, cooldown 7 days), the multichain route (Robinhood Chain first: `RemoteStacker` + `StackReceiver` on IMD's LayerZero OFT), and the v2 ETH route when a project needs it.

## Useful facts
- **IMD:** docs https://imd.fun/docs/llms.txt · API https://api.imd.fun · free `POST /requests/import` and `POST /requests/check` · jobs are paid from `0xf8ad…cdc7`. Launch chains: Sepolia, Ethereum, Robinhood Chain.
- **Request bodies pin a commit** (`baseCommit`). After changing a job text or the code, regenerate the JSON and re-run import + check.
- **Hosting:** set it only with the `ipfs` field; never ask the agent to host or deploy in a job text. IMD hosts sites itself at `<label>.sites.imd.fun` (PLEA: https://plea-make-your-case.sites.imd.fun/#/), so no GitHub Pages. Pages use hash routes (`#/…`); real static files such as `/llms.txt` are served as they are. `github: true` only delivers the source to the project's repository.
- **Workflow wording that passed the check:** say plainly "deploy two smart contracts on Sepolia", say what they do, and in `context` that publishing the website is approved and the platform does it, not the builders.
- **Intake v2** `0xa43e6f75ee006411f79ac1c84120606c2330de82` (Ethereum, Sepolia, Robinhood Chain):
  - `requestWithFailure`; callback `0x510379c7`, failure `0xa7980e31`; callback gas 200k on mainnet, 1M on Sepolia;
  - oracle signer `0x5598aa9146215bc13eb26f2c692ad1461fd32982`;
  - Sepolia test IMD `0x44a1cd38474fb1748400e7deb5f8d786cce3f89a`, `mint` open to anyone;
  - **the oracle has no Sepolia RPC:** questions are filed under chain 1 and name Sepolia in the text.
- **Mainnet:** IMD `0xd34a99bc0f67ae1bbd63c660e6d0b0dd03e263b7` (LayerZero OFT, linked to Arbitrum, Base and Robinhood Chain eid 30416); sIMD `0x9efa934d9fad4ae28c998a40195646b965a97247` (ERC-4626, owner renounced, one-block hold).
- **RPCs:** Sepolia `https://ethereum-sepolia-rpc.publicnode.com` (state) and `https://rpc.sepolia.ethpandaops.io` (old logs; publicnode prunes them); Ethereum `https://ethereum-rpc.publicnode.com`.
- **Foundry:** download `foundry_v1.8.3_linux_amd64.tar.gz` from the GitHub release into `~/.foundry/bin` (`foundryup` is blocked). Keep `bytecode_hash = "none"`, 10,000 optimizer runs and `[lint] lint_on_build = false`. Run `forge fmt --check src test` before pushing.
- **Test wallet:** `0x4b91078b2374c956a65f7af0999cae0a935e6821`; its key is in env `TESTNET_KEY` if set. Testnet only.

## Rules
- **Explain simply.** When I need to choose, recommend one option. Ask before paying for any job.
- **Don't change agreed numbers** without asking me: cashback 0.25%–1% chosen by each project; the fee guard; points = 1 per IMD stacked by a listed project; faucet amounts; the multichain tip up to 2% over 12 hours; the registry settings above.
- **Keys:** never print or commit `TESTNET_KEY`; never ask me for a mainnet key.
- **PLEA** (`khaed1/plea`, `khaed1/plea-site`) belongs to the other session: read only, don't push.
- **PondPad** (branch `claude/bold-gauss-qhlw86` in `khaed1/claude`) is read-only. Never commit its code.
