Repo: **`khaed1/imd-acc`** (code, tests, docs, IMD job prompts). If it isn't in your session, attach it with `add_repo` (push access). Branches: **`main`** = the mainnet manifest (`launch.json`: the Stacker only); **`sepolia`** = `main` plus a Sepolia `launch.json` (Stacker + ProjectRegistry). Work on `main`, then merge `main` into `sepolia` so they differ only in `launch.json`. Deployed code lives in IMD's launch repositories (reference only): [launch-1129](https://github.com/identity-md-launches/launch-1129-build-imd-acc-sepolia-test) (first Sepolia run) and [launch-1294](https://github.com/identity-md-launches/launch-1294-deploy-two-smart-contracts) (test run 2: contracts, and the site in `site/`).

You're working on **imd/acc**, a project I'm building on the IMD swarm (imd.fun). A separate session on my other account works on **PLEA**, imd/acc's first integration: don't change PLEA, use it as the live example.

## imd/acc in brief
Trading cashback paid in **staked IMD (sIMD)**, inspired by TokenWorks' btc/acc. A project sends **0.25%–1% of each trade** (its choice; PLEA uses 0.5%), out of fees it already charges, to the trader as sIMD through one shared, ownerless **`Stacker.credit(trader, imdAmount)`**: it pulls the IMD from the project and calls `sIMD.deposit(amount, trader)`, so the vault mints shares straight to the trader. No new token, no cut. Every `Stacked(project, trader, imd, shares)` event is a record; **points** = 1 per IMD stacked, counted only for **listed** projects inside their listing periods. A **fee guard** stops owners from farming points. Listing is decided by the ownerless **ProjectRegistry**: anyone applies or challenges, an IdentityMD oracle panel answers yes or no through Intake v2, and a challenge bond protects projects from spam.

## Read, in this order
1. `README.md`: overview, contracts, deployments, points, integration rules, roadmap.
2. `docs/design.md`: every decision, with the reasons. Key sections: cashback rate (and rate changes); project points and the dashboard; **The ProjectRegistry** (settings, Sepolia trial); multichain; who pays the gas; decided; open questions.
3. `docs/listing.md`: how a project gets listed, the checklist and the fee guard.
4. `docs/history.md`: what happened, sections 1–14, with transactions and checks. Sections 10–14 are this session: settings confirmed, IMD's contract changes, test run 2 live, the site, the rate decision.
5. `src/Stacker.sol`, `src/ProjectRegistry.sol`, `src/oracle/OracleAttestation.sol`, and `test/` (the `main` versions; the deployed Sepolia versions are in launch-1294, see below).
6. `jobs/` (IMD job prompts, numbered) and `jobs/requests/` (exact request bodies). `docs/plea-test-run-2.md` is what the PLEA session was given.

## Where we stopped (2026-10-11, 13:30 UTC)
- **Sepolia test run 2 is live** (launch #1294, block 11,891,109, job `0b69e5bd-873f-4bcf-9e02-ef1a00a4b2f5`):
  - Stacker `0x0457276d7b036818b3eddc1a4a3fceda61e9314d`
  - ProjectRegistry `0x3a3bfcb65614292b0ec7c62f9e3a5dac003b920e` (fee `ORACLE_FEE()` 0.5 test IMD read live from the Intake, bond 5 test IMD, cooldown 1 hour, panel 15/11, 1-day expiry)
  - reusing launch #1129's TestIMD `0x2b69099e59b05901faa1dd164fabf098bf831e82` (faucet 10,000 tIMD/24h) and TestSIMD `0xf9e2eec3b610ec6781f7438ac5fb4bc049d81cc1` (owner `0x4b91…6821` can pause it).
  - Checked on chain: the code equals the build I tested (157 tests, forks included), wiring and settings right.
- **IMD's audit changed both contracts before deploying** (history section 11), so **the Sepolia code differs from `main`**: the Stacker checks and approves the vault on its first credit; the registry reads the fee live, consumes each answer once, blocks `setBeneficiary` while a question is open and needs `challengeForBeneficiary` after any handoff, caps the cooldown, **doesn't restart the cooldown after a defended challenge** (I recommended keeping this; not yet explicitly confirmed), and **judges the current rate within 25–100 bps at a challenge** (confirmed, history section 14).
- **Rate decision (confirmed):** a listed project may change its rate within 0.25%–1% if its code keeps the range and the fee guard for every allowed setting. Points count credits within 25–100 bps of their trade. Docs updated.
- **Site v1 live:** https://imd-acc-sepolia-test-run-2.sites.imd.fun/ (app `#/`, docs `#/docs`, `/llms.txt`), job `a9afb834-83e0-43a4-97ca-1ecdfc6989b0`. Checked in a browser (history section 13). I didn't like the single long app page.
- **Site follow-up running:** `jobs/7-sepolia-v2-site-pages.md` (separate pages, per-field form errors, no empty gaps), paid 13:19 UTC, order `02824fca-d93c-4059-914e-b52c9d694c9c`, **job `b874bae9-bf1c-4803-86ef-ce2e52b1bcab`** (`build-website`, then `design-critic`). Check it every 30 minutes.
- **PLEA:** I was given `docs/plea-test-run-2.md` to pass to the PLEA session. Its next version credits through the new Stacker and applies at 50 bps. Waiting on it.
- **Mainnet Stacker:** `jobs/4-mainnet-launch.md`, request pinned to `main` at `e3e54a6` (without IMD's fixes). Not paid; comes after the trial.
- **Registry settings (confirmed):** panel 15 seats / 11 agree, open questions expire after 1 day; Sepolia bond 5 test IMD, cooldown 1 hour; mainnet bond 20 IMD (`20e18`), cooldown 7 days (`604800`).

## Next
1. **When job `b874bae9` finishes:** check the site in a browser on every route, both themes, 360/768/1280 px: no console errors, no horizontal scroll, the top bar one row (Menu button below 860 px), deep links, form errors, and the wallet flows. How I tested v1: Playwright (`/opt/node-tools/node_modules/playwright`) against the live site, with the site's three RPC hosts and an injected EIP-1193/EIP-6963 test wallet both routed to a local `anvil --fork-url <sepolia> --chain-id 11155111`, so transactions use anvil's funded account and nothing touches live Sepolia. Record the result in the history and the README.
2. **The registry trial with PLEA** (steps in `docs/design.md`, "Sepolia trial with PLEA"): PLEA expected yes; negative cases expected no (a plain wallet is refused before asking; a contract that credits its own IMD); a no-answer case clears the application; a challenge PLEA should survive (bond to its beneficiary). Follow the registry's events; record the results and tx hashes.
3. **Before mainnet, ask me first:** bring IMD's Sepolia fixes into `main`, add to the panel's feeGuard wording "if the rate or the fee split can change, the code must keep this true for every allowed setting", confirm the cooldown change, then re-run the tests, regenerate `jobs/requests/4-mainnet-launch.json` (new `baseCommit`) and re-run import + check.
4. Then: the mainnet Stacker (job 4), an indexer (IMD skill `build-ponder-indexer`) and the mainnet dashboard (with each project's measured current rate), the mainnet registry (bond 20 IMD, cooldown 7 days), the multichain route (Robinhood Chain first: `RemoteStacker` + `StackReceiver` on IMD's LayerZero OFT), and the v2 ETH route when a project needs it.

## Useful facts
- **IMD:** docs https://imd.fun/docs/llms.txt · API https://api.imd.fun · jobs are paid from my wallet `0xf8ad3f88b0e0d177aa8c5e6be1e13410fd41cdc7`, through the imd.fun form (I paste plain text, not JSON). Launch chains: Sepolia, Ethereum, Robinhood Chain.
- **Following an order (all public):** `GET /requests/paid-by/<wallet>` (newest first) → `GET /jobs/<id>` (state, nodes, launch, site) → `GET /jobs/<id>/submissions` (each step's summary; the judge's findings) → `GET /jobs/<id>/result` (source bundles: git bundles at `/bundles/<hash>`) → `GET /launches/<id>` (artifacts with addresses, admission checks).
- **Free checks:** `POST /requests/import` (resolves a repo commit) and `POST /requests/check` (blockers). A `job.continue` can only be checked once its parent job has finished; check the text as a `job.open` probe until then.
- **The form:** "My GitHub repository" deploys our code; "New contracts" lets agents rewrite it (don't). The form opens a `launch.open` (contracts only, with the four-specialist audit), not a workflow, so the website is a separate `job.continue`.
- **Website job texts:** at most about 7,800 characters, because IMD renders the text into the `design-critic` step too (7,946 characters failed with `objective_too_large`). Don't ask the builders to host anything.
- **Hosting:** IMD hosts sites at `<label>.sites.imd.fun` and chooses the label itself. Pages use hash routes (`#/…`); real static files like `/llms.txt` are served as they are. `github: true` only delivers the source to the launch repository. Not GitHub Pages.
- **IMD's builders may change the contracts** during a launch's adapt and revision steps. Read the judge's findings and diff the delivered `src/` against ours before trusting the deployment.
- **Intake v2** `0xa43e6f75ee006411f79ac1c84120606c2330de82` (Ethereum, Sepolia, Robinhood Chain):
  - `requestWithFailure`; callback `0x510379c7`, failure `0xa7980e31`; callback gas 200k on mainnet, 1M on Sepolia; `priceOf(action, asset)` gives the fee (0.5);
  - oracle signer `0x5598aa9146215bc13eb26f2c692ad1461fd32982`;
  - Sepolia test IMD `0x44a1cd38474fb1748400e7deb5f8d786cce3f89a`, `mint(to, amount)` open to anyone;
  - **the oracle has no Sepolia RPC:** questions are filed under chain 1 and name Sepolia in the text.
- **Mainnet:** IMD `0xd34a99bc0f67ae1bbd63c660e6d0b0dd03e263b7` (LayerZero OFT, linked to Arbitrum, Base and Robinhood Chain eid 30416; about $8.6 on 2026-10-11); sIMD `0x9efa934d9fad4ae28c998a40195646b965a97247` (ERC-4626, owner renounced, one-block hold).
- **imd.fun's look**, used for our site: IBM Plex Mono; paper/ink #fff/#000 and #000/#fff; dim #555/#9a9a9a; lines #e6e6e6/#262626; square corners; 1.5px ink rules. Its light gray `#999` and light green `#1f9d55` fail AA for small text; we use `#999` for lines only and `#17804a` for green text.
- **RPCs:** Sepolia `https://ethereum-sepolia-rpc.publicnode.com` (state) and `https://rpc.sepolia.ethpandaops.io` (old logs; publicnode prunes them); Ethereum `https://ethereum-rpc.publicnode.com`.
- **Foundry:** download `foundry_v1.8.3_linux_amd64.tar.gz` from the GitHub release into `~/.foundry/bin` (`foundryup` is blocked; the tarball includes anvil and cast). Keep `bytecode_hash = "none"`, 10,000 optimizer runs and `[lint] lint_on_build = false`. Run `forge fmt --check src test` before pushing.
- **Test wallet:** `0x4b91078b2374c956a65f7af0999cae0a935e6821`; its key is in env `TESTNET_KEY` if set (it wasn't this session). Testnet only.

## Rules
- **Explain simply.** When I need to choose, recommend one option. Ask before paying for any job, and give me the job text to paste.
- **Don't change agreed numbers** without asking me: cashback 0.25%–1% chosen by each project, which a listed project may change within that range if its code keeps the range and the fee guard for every allowed setting; the fee guard; points = 1 per IMD stacked by a listed project; faucet amounts; the multichain tip up to 2% over 12 hours; the registry settings above.
- **Keys:** never print or commit `TESTNET_KEY`; never ask me for a mainnet key.
- **PLEA** (`khaed1/plea`, `khaed1/plea-site`) belongs to the other session: read only, don't push.
- **PondPad** (branch `claude/bold-gauss-qhlw86` in `khaed1/claude`) is read-only. Never commit its code.
