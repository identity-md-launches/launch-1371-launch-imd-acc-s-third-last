# Site check

Browser checks for the imd/acc Sepolia test site (test run 2). Not part of the contracts; nothing here is deployed.

- **Reads** come from live Sepolia, or from a local `anvil` fork when `FORK=1`.
- **Transactions** only ever go to the fork: the site's three RPC hosts and an injected EIP-1193/EIP-6963 test wallet are routed to `anvil`, which impersonates a fresh address (`ACCOUNT`), so no key is needed and nothing touches live Sepolia.
- `fork-answer.sh <project> yes|no|fail` answers a project's open question **on the fork only**: it swaps the registry's oracle signer (storage slot 2) for a test key, impersonates the Intake and sends a signed `onOracleResult`, or an `onOracleFailure`. That is how `Listed`, `Defended`, `Delisted` and `AskCleared` are shown without the real panel.

## Run

Needs Node 22, Playwright (here `/opt/node-tools/node_modules/playwright` with Chromium in `/opt/pw-browsers`) and Foundry 1.8.3.

```sh
cd tools/site-check && npm install
anvil --fork-url https://rpc.sepolia.ethpandaops.io --chain-id 11155111 --port 8545 --silent &
node layout.mjs                 # every route, 360/768/1280, both themes, live reads
node behavior.mjs               # menu, keyboard, back/forward, deep links, docs nav, theme, /llms.txt
# flows.mjs expects two fork fixtures: TestSIMD's address listed, TestIMD's address with an open question
node flows.mjs                  # wallet flows and form errors on the fork (WIDTH=360 for mobile)
FORK=1 PROJECTS=0x…,0x… node layout.mjs   # the same matrix with a populated registry
node refresh-bug.mjs            # does a data refresh remove the Apply question or a field error?
```

`SITE` overrides the site URL. Results print as PASS/FAIL lines; `layout.mjs` also writes `layout-live.json` or `layout-fork.json`.
