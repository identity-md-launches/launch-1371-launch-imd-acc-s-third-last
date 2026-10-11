/**
 * imd/acc - Interactive Web3 Application & Hash SPA Router
 * Rich Modern Web3 Aesthetics with Full Hash Page Routing
 */

(() => {
  'use strict';

  // --- Constants & Addresses ---
  const CURRENT_BLOCK = 11891109;
  const DATA_BLOCK_TEXT = `Data at block ${CURRENT_BLOCK.toLocaleString()}`;

  const ADDRESSES = {
    SEPOLIA_CHAIN_ID: '0xaa36a7', // 11155111
    STACKER: '0x0457276d7b036818b3eddc1a4a3fceda61e9314d',
    PROJECT_REGISTRY: '0x3a3bfcb65614292b0ec7c62f9e3a5dac003b920e',
    TEST_IMD: '0x2b69099e59b05901faa1dd164fabf098bf831e82',
    TEST_SIMD: '0xf9e2eec3b610ec6781f7438ac5fb4bc049d81cc1',
    ORACLE_FEE_TOKEN: '0x44a1cd38474fb1748400e7deb5f8d786cce3f89a',
    INTAKE_V2: '0xa43e6f75ee006411f79ac1c84120606c2330de82',
    MAINNET_IMD: '0xd34a99bc0f67ae1bbd63c660e6d0b0dd03e263b7',
    MAINNET_SIMD: '0x9efa934d9fad4ae28c998a40195646b965a97247'
  };

  // --- State ---
  const state = {
    theme: localStorage.getItem('imd_acc_theme') || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'),
    account: null,
    chainId: null,
    isSepolia: false,
    faucetClaimed: false,
    timdApproved: false,
    mockBalances: {
      cashback: 25.0,
      shares: 24.12,
      worth: 26.35,
      points: 25.0
    },
    stacks: [
      { project: 'PLEA', trader: '0x71C8...3B19', imd: '15.0000', shares: '14.4648', points: '15.0000', listed: true, time: '2m ago' },
      { project: 'PLEA', trader: '0x882a...98e1', imd: '10.0000', shares: '9.6432', points: '10.0000', listed: true, time: '14m ago' },
      { project: 'SelfCredit', trader: '0x3D17...1488', imd: '5.0000', shares: '4.8216', points: '0.0000', listed: false, time: '1h ago' }
    ],
    projects: [
      {
        address: '0x3D1778bE5f9E55f0dF35ACAF64A13Efe2FE81488',
        name: 'SelfCredit (Trial Test)',
        state: 'Negative Case',
        rateBps: 50,
        chain: 'Sepolia Testnet',
        feeFunding: 'Direct test wallet',
        beneficiary: '0x4b91078b2374c956a65f7af0999cae0a935e6821',
        history: ['Applied', 'Rejected (trial)'],
        openQuestion: null,
        isRegistered: false
      },
      {
        address: '0xf9e2eec3b610ec6781f7438ac5fb4bc049d81cc1',
        name: 'PLEA (v10 Hook)',
        state: 'Live Integration',
        rateBps: 50,
        chain: 'Ethereum (Sepolia)',
        feeFunding: 'Trading fee (0.5% cut)',
        beneficiary: '0x4b91078b2374c956a65f7af0999cae0a935e6821',
        history: ['Applied', 'Listed', 'Defended'],
        openQuestion: null,
        cooldownRemaining: '58 min',
        isRegistered: true
      },
      {
        address: '0x2b69099e59b05901faa1dd164fabf098bf831e82',
        name: 'PondPad Launchpad',
        state: 'Planned',
        rateBps: 75,
        chain: 'Robinhood Chain',
        feeFunding: 'Launchpad trade fee',
        beneficiary: '0x4b91078b2374c956a65f7af0999cae0a935e6821',
        history: ['Planned via LayerZero'],
        openQuestion: null,
        isRegistered: true
      }
    ],
    appliedProjects: {},
    applyForm: {
      project: '',
      name: '',
      url: '',
      rate: '50',
      beneficiary: '',
      errors: {},
      mintedFeeToken: false,
      approvedFee: false
    }
  };

  // --- Utilities ---
  function safe(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function shortAddr(addr) {
    if (!addr) return '';
    return addr.length > 10 ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : addr;
  }

  function formatNumber(num, maxDecimals = 2) {
    return num.toLocaleString('en-US', {
      minimumFractionDigits: maxDecimals > 0 ? 2 : 0,
      maximumFractionDigits: maxDecimals
    });
  }

  let toastTimer = null;
  function showToast(msg) {
    const toast = document.getElementById('toast-msg');
    const txt = document.getElementById('toast-text');
    if (!toast) return;
    if (txt) txt.textContent = msg;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 2800);
  }

  // --- Theme Management ---
  function applyTheme(t) {
    state.theme = t;
    document.documentElement.dataset.theme = t;
    localStorage.setItem('imd_acc_theme', t);

    const icon = document.getElementById('icon-theme');
    if (icon) {
      if (t === 'light') {
        icon.innerHTML = `
          <circle cx="12" cy="12" r="5"></circle>
          <line x1="12" y1="1" x2="12" y2="3"></line>
          <line x1="12" y1="21" x2="12" y2="23"></line>
          <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
          <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
          <line x1="1" y1="12" x2="3" y2="12"></line>
          <line x1="21" y1="12" x2="23" y2="12"></line>
          <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
          <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
        `;
      } else {
        icon.innerHTML = `<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>`;
      }
    }
  }

  // --- Web3 Transaction Handler (1.3x Gas Margin) ---
  async function sendTxWithGas(txParams) {
    if (!window.ethereum) throw new Error('No Web3 wallet available');
    const from = state.account || (await window.ethereum.request({ method: 'eth_accounts' }))[0];
    const tx = { ...txParams, from };

    try {
      const estHex = await window.ethereum.request({
        method: 'eth_estimateGas',
        params: [tx]
      });
      const estNum = parseInt(estHex, 16);
      const gasWithMargin = Math.ceil(estNum * 1.3);
      tx.gas = '0x' + gasWithMargin.toString(16);
    } catch (e) {
      tx.gas = '0x4c4b40'; // Safe fallback
    }

    return await window.ethereum.request({
      method: 'eth_sendTransaction',
      params: [tx]
    });
  }

  // --- Router & Page Renderers ---
  const appRoot = document.getElementById('app-root');

  function render() {
    const rawHash = location.hash || '#/';
    let route = rawHash.replace(/^#/, '');
    if (!route || route === '/') route = '/';

    // Update active nav highlights
    const cleanRoute = route.split('/')[1] || 'home';
    document.querySelectorAll('.nav-link').forEach((link) => {
      const linkRoute = link.getAttribute('data-route');
      if (linkRoute === cleanRoute || (cleanRoute === 'home' && linkRoute === 'home')) {
        link.classList.add('active');
        link.setAttribute('aria-current', 'page');
      } else {
        link.classList.remove('active');
        link.removeAttribute('aria-current');
      }
    });

    // Close mobile nav if open
    const navMenu = document.getElementById('nav-menu');
    if (navMenu) navMenu.classList.remove('open');
    document.getElementById('mobile-toggle')?.setAttribute('aria-expanded', 'false');

    // Route Dispatch
    if (route === '/') {
      renderHome();
    } else if (route === '/stack') {
      renderStack();
    } else if (route === '/calculator') {
      renderCalculator();
    } else if (route === '/projects') {
      renderProjects();
    } else if (route.startsWith('/projects/')) {
      const addr = route.slice('/projects/'.length);
      renderProjectDetail(addr);
    } else if (route === '/apply') {
      renderApply();
    } else if (route === '/leaderboard') {
      renderLeaderboard();
    } else if (route === '/contracts') {
      renderContracts();
    } else if (route.startsWith('/docs')) {
      renderDocs();
    } else {
      renderNotFound();
    }

    // Scroll cleanly to top (without triggering artificial focus outlines)
    window.scrollTo({ top: 0, behavior: 'instant' });
    initCommonListeners();
  }

  // --- Page: Overview / Home (#/) ---
  function renderHome() {
    document.title = 'imd/acc · Trading Cashback in Staked IMD';

    appRoot.innerHTML = `
      <div class="page-view">
        <section class="hero-section">
          <div class="hero-pill">
            <span class="hero-pill-dot"></span>
            <span>Zero-Custody Trading Cashback</span>
          </div>
          <h1 class="hero-title">
            Every Trade Stacks <span class="gradient-text">Staked IMD</span> For You.
          </h1>
          <p class="hero-desc">
            Participating projects send <strong>0.25% to 1%</strong> of each trade straight to your wallet as sIMD shares in IMD's staking vault. No extra fee, no claiming, and it earns continuous yield.
          </p>

          <div class="hero-actions">
            <a href="#/stack" class="btn btn-primary">
              <span>Launch App & Stack</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
            </a>
            <a href="#/calculator" class="btn btn-secondary">
              <span>Calculate Cashback</span>
            </a>
            <a href="#/projects" class="btn btn-secondary">
              <span>View Projects</span>
            </a>
          </div>

          <!-- 4 Core Pillars -->
          <div class="pillars-grid">
            <div class="pillar-card">
              <div class="pillar-header">
                <h3 class="pillar-title">No New Token</h3>
              </div>
              <p class="pillar-desc">The cashback is pure IMD, staked. There is nothing speculative to buy or manage.</p>
            </div>

            <div class="pillar-card">
              <div class="pillar-header">
                <h3 class="pillar-title">Zero Custody</h3>
              </div>
              <p class="pillar-desc">imd/acc never holds your tokens. The ERC-4626 vault mints shares directly to your wallet.</p>
            </div>

            <div class="pillar-card">
              <div class="pillar-header">
                <h3 class="pillar-title">No Extra Fee</h3>
              </div>
              <p class="pillar-desc">Projects pay cashback out of fees they already charge. Traders pay nothing extra on top.</p>
            </div>

            <div class="pillar-card">
              <div class="pillar-header">
                <h3 class="pillar-title">Ownerless Contract</h3>
              </div>
              <p class="pillar-desc">The Stacker contract has no admin, no pause, no fee take, and immutable parameters.</p>
            </div>
          </div>

          <!-- Animated Architecture Pipeline -->
          <div class="flow-diagram-container">
            <div class="diagram-header">
              <h3 class="diagram-title">How Cashback Moves in a Single Transaction</h3>
              <p class="diagram-subtitle">From swap hook directly into your vault balance in the same atomic block</p>
            </div>

            <div class="pipeline-steps">
              <div class="pipeline-step">
                <span class="step-num">1</span>
                <h4 class="step-title">Trader Swaps</h4>
                <p class="step-desc">Trader executes a trade in a participating Uniswap v4 pool (e.g. PLEA/IMD).</p>
                <div class="step-badge">hookData &rarr; real trader</div>
              </div>

              <div class="pipeline-step">
                <span class="step-num">2</span>
                <h4 class="step-title">Hook Cuts Rate</h4>
                <p class="step-desc">The pool hook extracts 0.25%–1% of the trade on the IMD side out of its regular fee.</p>
                <div class="step-badge">25 to 100 bps</div>
              </div>

              <div class="pipeline-step">
                <span class="step-num">3</span>
                <h4 class="step-title">Stacker.credit()</h4>
                <p class="step-desc">Stacker pulls the IMD from the pool and immediately deposits it into the sIMD vault.</p>
                <div class="step-badge">0 IMD held in transit</div>
              </div>

              <div class="pipeline-step">
                <span class="step-num">4</span>
                <h4 class="step-title">sIMD In Wallet</h4>
                <p class="step-desc">sIMD shares arrive in the trader's wallet, accruing vault yield with 1 pt per IMD.</p>
                <div class="step-badge">Shares & Points live</div>
              </div>
            </div>
          </div>
        </section>

        <!-- Quick Summary Box -->
        <div class="dashboard-card" style="padding: 24px;">
          <div class="card-header-row" style="margin-bottom: 12px;">
            <h3 class="card-title" style="font-size: 1.05rem;">Live Sepolia Network Status</h3>
            <span class="pill pill-live">Test Run 2 Live</span>
          </div>
          <p class="secondary" style="margin-bottom: 16px;">${DATA_BLOCK_TEXT} &middot; Stacker and ProjectRegistry verified and operational.</p>
          <div style="display: flex; gap: 12px; flex-wrap: wrap;">
            <a href="#/stack" class="btn btn-primary btn-sm">Your Stack Console</a>
            <a href="#/calculator" class="btn btn-secondary btn-sm">Launch Calculator</a>
            <a href="#/projects" class="btn btn-secondary btn-sm">View Projects</a>
          </div>
        </div>
      </div>
    `;
  }

  // --- Page: Stack & Test Tools (#/stack) ---
  function renderStack() {
    document.title = 'Stack - imd/acc';
    const b = state.mockBalances;

    appRoot.innerHTML = `
      <div class="page-view">
        <div class="page-header-block">
          <div class="page-tag"><span class="status-indicator"></span> Sepolia Testnet &middot; ${DATA_BLOCK_TEXT}</div>
          <h1 class="page-title">Your Stack & Testnet Console</h1>
          <p class="page-desc">Track accumulated cashback, sIMD vault shares, and use the Sepolia testnet tools.</p>
        </div>

        <div class="app-grid">
          <!-- Stack Dashboard -->
          <div class="dashboard-card">
            <div class="card-header-row">
              <h3 class="card-title">Your Stack Dashboard</h3>
              <div class="badge-status ${state.account ? 'connected' : 'disconnected'}">
                <span class="status-indicator"></span>
                <span>${state.account ? `Connected: ${shortAddr(state.account)}` : 'Demo Mode (Connect Wallet for on-chain reads)'}</span>
              </div>
            </div>

            <div class="stats-grid">
              <div class="stat-box">
                <span class="stat-label">Cashback Received</span>
                <span class="stat-val" id="stat-cashback">${b.cashback.toFixed(4)} IMD</span>
                <span class="stat-change">From 5 listed trades</span>
              </div>

              <div class="stat-box">
                <span class="stat-label">sIMD Shares Held</span>
                <span class="stat-val" id="stat-shares">${b.shares.toFixed(4)} sIMD</span>
                <span class="stat-change">Live in ERC-4626 vault</span>
              </div>

              <div class="stat-box">
                <span class="stat-label">Current Value</span>
                <span class="stat-val" id="stat-worth">${b.worth.toFixed(4)} IMD</span>
                <span class="stat-change">+${(b.worth - b.cashback).toFixed(4)} IMD yield</span>
              </div>

              <div class="stat-box">
                <span class="stat-label">Total Points</span>
                <span class="stat-val" id="stat-points">${b.points.toFixed(4)} PTS</span>
                <span class="stat-change">1 PT per IMD stacked</span>
              </div>
            </div>

            <h4 style="font-size: 0.95rem; margin-bottom: 12px;">Recent Cashback Events</h4>
            <div class="projects-table-wrap">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Project</th>
                    <th>Cashback</th>
                    <th>Shares</th>
                    <th>Points</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody id="events-table-body">
                  ${state.stacks.map(s => `
                    <tr>
                      <td><strong class="mono">${safe(s.project)}</strong></td>
                      <td class="mono">${safe(s.imd)} IMD</td>
                      <td class="mono">${safe(s.shares)} sIMD</td>
                      <td class="mono">${safe(s.points)}</td>
                      <td><span class="pill ${s.listed ? 'pill-live' : 'pill-test'}">${s.listed ? 'Listed' : 'Direct'}</span></td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          </div>

          <!-- Test Tools -->
          <div class="test-tools-box">
            <div class="tool-card">
              <h4 class="tool-title">Sepolia Test IMD Faucet</h4>
              <p class="tool-desc">Request 10,000 TestIMD per address every 24 hours to test trades and crediting.</p>
              <button class="btn btn-primary btn-sm" id="btn-faucet" style="width: 100%;">
                <span>Request 10,000 TestIMD</span>
              </button>
            </div>

            <div class="tool-card">
              <h4 class="tool-title">Test "Stack to Myself"</h4>
              <p class="tool-desc">Approve TestIMD and call <code>Stacker.credit(self, amount)</code> to test the vault minting path.</p>
              <div class="tool-input-row" style="margin-bottom: 10px;">
                <input type="number" class="input-text" id="self-stack-amt" value="5" min="1" step="1" placeholder="Amount">
                <button class="btn btn-secondary btn-sm" id="btn-approve-imd">${state.timdApproved ? 'Approved' : 'Approve'}</button>
                <button class="btn btn-primary btn-sm" id="btn-self-stack">Stack</button>
              </div>
              <div class="secondary" style="font-size: 0.78rem;">Self-stacks are direct, no points.</div>
            </div>

            <div class="tool-card" style="background: var(--bg-card);">
              <h4 class="tool-title">Sepolia Verification Status</h4>
              <p class="tool-desc" style="margin-bottom: 8px;">Stacker v2 deployed at block <code>11,891,109</code>.</p>
              <div style="font-size: 0.8rem; color: var(--text-muted); line-height: 1.5;">
                • Vault status: <span style="color: var(--status-live);">Active (Unpaused)</span><br>
                • Challenge bond: <span class="mono">5 TestIMD</span><br>
                • Cooldown: <span class="mono">1 Hour</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    document.getElementById('btn-faucet')?.addEventListener('click', async () => {
      try {
        await sendTxWithGas({
          to: ADDRESSES.TEST_IMD,
          data: '0xde5f72fd'
        });
        showToast('Faucet transaction sent on Sepolia!');
      } catch (e) {
        showToast('Simulated +10,000 tIMD added in demo!');
      }
      state.faucetClaimed = true;
    });

    document.getElementById('btn-approve-imd')?.addEventListener('click', async () => {
      try {
        await sendTxWithGas({
          to: ADDRESSES.TEST_IMD,
          data: '0x095ea7b3000000000000000000000000' + ADDRESSES.STACKER.slice(2).toLowerCase() + 'ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff'
        });
        showToast('TestIMD approved for Stacker!');
      } catch (e) {
        showToast('TestIMD approved in demo mode!');
      }
      state.timdApproved = true;
      document.getElementById('btn-approve-imd').textContent = 'Approved';
    });

    document.getElementById('btn-self-stack')?.addEventListener('click', async () => {
      const amt = parseFloat(document.getElementById('self-stack-amt')?.value) || 5;
      try {
        const addrPadded = (state.account || '0xa987ef2aa4d2c0558cc6405f1a8253507274dc5d').slice(2).padStart(64, '0');
        const amtHex = (amt * 1e18).toString(16).padStart(64, '0');
        await sendTxWithGas({
          to: ADDRESSES.STACKER,
          data: '0x8b1a8be6' + addrPadded + amtHex
        });
        showToast(`Stacked ${amt} tIMD to yourself!`);
      } catch (e) {
        showToast(`Stacked ${amt} tIMD (simulated in demo)!`);
      }
      state.mockBalances.cashback += amt;
      state.mockBalances.shares += (amt / 1.037);
      state.mockBalances.worth += amt * 1.04;
      state.stacks.unshift({
        project: 'SelfCredit',
        trader: shortAddr(state.account || '0xa987ef2aa4d2c0558cc6405f1a8253507274dc5d'),
        imd: amt.toFixed(4),
        shares: (amt / 1.037).toFixed(4),
        points: '0.0000',
        listed: false,
        time: 'just now'
      });
      renderStack();
    });
  }

  // --- Page: Calculator (#/calculator) ---
  function renderCalculator() {
    document.title = 'Calculator - imd/acc';

    appRoot.innerHTML = `
      <div class="page-view">
        <div class="page-header-block">
          <div class="page-tag">Interactive Simulator</div>
          <h1 class="page-title">Cashback & Yield Calculator</h1>
          <p class="page-desc">Calculate how much staked IMD (sIMD) and points you earn on trades, plus projected vault compounding.</p>
        </div>

        <div class="calc-card">
          <!-- Inputs Column -->
          <div class="calc-inputs">
            <div class="input-group">
              <div class="input-label-row">
                <label for="trade-size-slider" class="input-label">Trade Volume (in IMD)</label>
                <span class="input-val-badge" id="trade-val-text">1,000 IMD</span>
              </div>
              <input type="range" id="trade-size-slider" class="range-slider" min="10" max="50000" step="10" value="1000">
              <div class="calc-presets">
                <button class="preset-chip" data-trade="500">500</button>
                <button class="preset-chip active" data-trade="1000">1,000</button>
                <button class="preset-chip" data-trade="5000">5,000</button>
                <button class="preset-chip" data-trade="20000">20,000</button>
              </div>
            </div>

            <div class="input-group">
              <div class="input-label-row">
                <label for="rate-slider" class="input-label">Project Cashback Rate</label>
                <span class="input-val-badge" id="rate-val-text">0.50% (50 bps)</span>
              </div>
              <input type="range" id="rate-slider" class="range-slider" min="0.25" max="1.00" step="0.05" value="0.50">
              <div class="calc-presets">
                <button class="preset-chip" data-rate="0.25">0.25% (Min)</button>
                <button class="preset-chip active" data-rate="0.50">0.50% (PLEA)</button>
                <button class="preset-chip" data-rate="0.75">0.75%</button>
                <button class="preset-chip" data-rate="1.00">1.00% (Max)</button>
              </div>
            </div>

            <div class="input-group">
              <div class="input-label-row">
                <label for="duration-slider" class="input-label">Vault Hold Duration (at 12% est. APY)</label>
                <span class="input-val-badge" id="duration-val-text">6 Months</span>
              </div>
              <input type="range" id="duration-slider" class="range-slider" min="1" max="24" step="1" value="6">
            </div>
          </div>

          <!-- Outputs Column -->
          <div class="calc-outputs">
            <div class="output-hero">
              <div class="output-label">Instant Cashback Received</div>
              <div class="output-value-big" id="cashback-output">5.00 IMD</div>
              <div class="output-sub">Minted as <span id="simd-shares-output" class="mono">~4.82 sIMD</span> vault shares directly into your wallet.</div>
            </div>

            <div class="output-breakdown">
              <div class="output-item">
                <span class="output-item-label">Estimated Value After Hold</span>
                <span class="output-item-val" id="future-value-output" style="color: var(--accent-light);">5.30 IMD</span>
              </div>
              <div class="output-item">
                <span class="output-item-label">Yield Earned On Top</span>
                <span class="output-item-val" id="yield-earned-output">+0.30 IMD</span>
              </div>
              <div class="output-item">
                <span class="output-item-label">Trader Points Accrued</span>
                <span class="output-item-val" id="points-output">5 Points</span>
              </div>
              <div class="output-item">
                <span class="output-item-label">Over 10 Similar Trades</span>
                <span class="output-item-val" id="ten-trades-output">50.00 IMD</span>
              </div>
            </div>

            <div class="yield-note">
              <strong>Vault Compounding:</strong> sIMD is an ERC-4626 vault share whose redemption price against IMD grows as staking yield accumulates. You can unstake back to IMD at any time!
            </div>
          </div>
        </div>
      </div>
    `;

    initCalculatorLogic();
  }

  function initCalculatorLogic() {
    const tradeSlider = document.getElementById('trade-size-slider');
    const rateSlider = document.getElementById('rate-slider');
    const durSlider = document.getElementById('duration-slider');

    function update() {
      if (!tradeSlider || !rateSlider || !durSlider) return;
      const size = parseFloat(tradeSlider.value) || 1000;
      const rate = parseFloat(rateSlider.value) || 0.50;
      const months = parseInt(durSlider.value, 10) || 6;

      document.getElementById('trade-val-text').textContent = `${formatNumber(size, 0)} IMD`;
      document.getElementById('rate-val-text').textContent = `${rate.toFixed(2)}% (${Math.round(rate * 100)} bps)`;
      document.getElementById('duration-val-text').textContent = `${months} Month${months > 1 ? 's' : ''}`;

      const cashback = size * (rate / 100);
      const shares = cashback / 1.037;
      const monthlyApy = 0.12 / 12;
      const futureVal = cashback * Math.pow(1 + monthlyApy, months);
      const yieldEarned = futureVal - cashback;

      document.getElementById('cashback-output').textContent = `${formatNumber(cashback)} IMD`;
      document.getElementById('simd-shares-output').textContent = `~${formatNumber(shares)} sIMD`;
      document.getElementById('future-value-output').textContent = `${formatNumber(futureVal)} IMD`;
      document.getElementById('yield-earned-output').textContent = `+${formatNumber(yieldEarned)} IMD`;
      document.getElementById('points-output').textContent = `${formatNumber(cashback, 1)} Points`;
      document.getElementById('ten-trades-output').textContent = `${formatNumber(cashback * 10)} IMD`;
    }

    tradeSlider?.addEventListener('input', update);
    rateSlider?.addEventListener('input', update);
    durSlider?.addEventListener('input', update);

    document.querySelectorAll('[data-trade]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('[data-trade]').forEach(b => b.classList.remove('active'));
        e.currentTarget.classList.add('active');
        tradeSlider.value = e.currentTarget.getAttribute('data-trade');
        update();
      });
    });

    document.querySelectorAll('[data-rate]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('[data-rate]').forEach(b => b.classList.remove('active'));
        e.currentTarget.classList.add('active');
        rateSlider.value = e.currentTarget.getAttribute('data-rate');
        update();
      });
    });

    update();
  }

  // --- Page: Projects (#/projects) ---
  let activeFilter = 'all';

  function renderProjects() {
    document.title = 'Projects - imd/acc';
    const allProjs = [...state.projects, ...Object.values(state.appliedProjects)];

    const filtered = allProjs.filter(p => {
      if (activeFilter === 'all') return true;
      if (activeFilter === 'live') return p.state.toLowerCase().includes('live') || p.state.toLowerCase().includes('listed');
      if (activeFilter === 'planned') return p.state.toLowerCase().includes('planned') || p.state.toLowerCase().includes('applied');
      return true;
    });

    appRoot.innerHTML = `
      <div class="page-view">
        <div class="page-header-block">
          <div class="page-tag">Ecosystem Registry &middot; ${DATA_BLOCK_TEXT}</div>
          <h1 class="page-title">Participating Projects</h1>
          <p class="page-desc">Only credits from listed projects earn points. Every project selects its rate between 0.25% and 1.0%.</p>
        </div>

        <div class="filter-tabs">
          <button class="filter-tab ${activeFilter === 'all' ? 'active' : ''}" data-filter="all">All Projects</button>
          <button class="filter-tab ${activeFilter === 'live' ? 'active' : ''}" data-filter="live">Live on Sepolia</button>
          <button class="filter-tab ${activeFilter === 'planned' ? 'active' : ''}" data-filter="planned">Planned Mainnet</button>
        </div>

        <div class="projects-table-wrap">
          <table class="data-table">
            <thead>
              <tr>
                <th>Project</th>
                <th>Chain</th>
                <th>Cashback Rate</th>
                <th>Fee Funding</th>
                <th>Registry Status</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              ${filtered.map(p => `
                <tr style="cursor: pointer;" onclick="location.hash='#/projects/${p.address}'">
                  <td>
                    <div style="font-weight: 700; color: var(--text-primary);">${safe(p.name)}</div>
                    <div class="secondary mono" style="font-size: 0.76rem;">${shortAddr(p.address)}</div>
                  </td>
                  <td><span class="mono">${safe(p.chain || 'Sepolia')}</span></td>
                  <td><strong class="mono" style="color: var(--accent-light);">${(p.rateBps / 100).toFixed(2)}% (${p.rateBps} bps)</strong></td>
                  <td>${safe(p.feeFunding || 'Trading fee cut')}</td>
                  <td><span class="pill ${p.state.includes('Live') || p.state.includes('Listed') ? 'pill-live' : p.state.includes('Planned') ? 'pill-planned' : 'pill-test'}">${safe(p.state)}</span></td>
                  <td><a href="#/projects/${p.address}" class="btn btn-secondary btn-sm">&rarr; View</a></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;

    document.querySelectorAll('.filter-tab').forEach(btn => {
      btn.addEventListener('click', (e) => {
        activeFilter = e.currentTarget.getAttribute('data-filter');
        renderProjects();
      });
    });
  }

  // --- Page: Project Detail (#/projects/<address>) ---
  function renderProjectDetail(rawAddr) {
    const addr = rawAddr.toLowerCase();
    document.title = `Project ${shortAddr(rawAddr)} - imd/acc`;
    const allProjs = [...state.projects, ...Object.values(state.appliedProjects)];
    const p = allProjs.find(x => x.address.toLowerCase() === addr);

    if (!p) {
      appRoot.innerHTML = `
        <div class="page-view">
          <div class="page-header-block">
            <h1 class="page-title">Project Not Found</h1>
          </div>
          <div class="dashboard-card">
            <p class="secondary">Contract ${safe(rawAddr)} has not been applied to the ProjectRegistry, or has no recorded events.</p>
            <div style="margin-top: 16px;">
              <a href="#/projects" class="btn btn-secondary btn-sm">&larr; Back to Projects</a>
              <a href="#/apply" class="btn btn-primary btn-sm">Apply for Listing</a>
            </div>
          </div>
        </div>
      `;
      return;
    }

    appRoot.innerHTML = `
      <div class="page-view">
        <div class="page-header-block">
          <div class="page-tag"><a href="#/projects">&larr; Projects Directory</a></div>
          <h1 class="page-title">${safe(p.name)}</h1>
          <p class="page-desc mono" style="font-size: 0.88rem;">${safe(p.address)}</p>
        </div>

        <div class="grid-2">
          <div class="dashboard-card">
            <div class="card-header-row">
              <h3 class="card-title">Project Details</h3>
              <span class="pill ${p.state.includes('Live') || p.state.includes('Listed') ? 'pill-live' : 'pill-planned'}">${safe(p.state)}</span>
            </div>
            <p style="margin-bottom: 8px;">Applied rate: <strong class="mono" style="color: var(--accent-light);">${(p.rateBps / 100).toFixed(2)}% (${p.rateBps} bps) (historical)</strong></p>
            <p style="margin-bottom: 8px;">Beneficiary: <span class="mono">${safe(p.beneficiary)}</span></p>
            <p>Fee Funding: ${safe(p.feeFunding || 'Trading fee cut')}</p>

            <h4 style="font-size: 0.95rem; margin-top: 20px; margin-bottom: 10px;">Registry Event Log</h4>
            <ul style="list-style: none; display: flex; flex-direction: column; gap: 6px; font-size: 0.85rem;" class="secondary">
              ${(p.history || []).map(h => `<li>&bull; ${safe(h)}</li>`).join('')}
            </ul>
          </div>

          <div class="dashboard-card">
            <div class="card-header-row">
              <h3 class="card-title">Challenge Listing</h3>
            </div>
            <p class="secondary" style="margin-bottom: 14px;">Anyone can challenge a listed project with a 5 test IMD bond + 0.5 fee. If the project meets the rules, the bond goes to its beneficiary; otherwise it is delisted.</p>
            ${p.cooldownRemaining ? `<p class="secondary" style="color: var(--status-pending); margin-bottom: 12px;">Cooldown active. Challenge opens in ${p.cooldownRemaining}.</p>` : ''}
            
            <div class="form-group">
              <label class="form-label" for="ch-reason">Reason for Challenge</label>
              <input type="text" id="ch-reason" class="form-input" placeholder="State reason (max 280 chars)...">
              <div id="ch-reason-error" class="field-error"></div>
            </div>

            <button class="btn btn-secondary btn-sm" id="btn-submit-challenge">Submit Challenge (5.5 tIMD)</button>
          </div>
        </div>
      </div>
    `;

    document.getElementById('btn-submit-challenge')?.addEventListener('click', () => {
      const reason = document.getElementById('ch-reason')?.value?.trim();
      const err = document.getElementById('ch-reason-error');
      if (!reason) {
        if (err) err.textContent = 'Reason is required';
        return;
      }
      showToast('Challenge submitted (simulated on Sepolia)!');
      p.history.push('Challenged');
      renderProjectDetail(rawAddr);
    });
  }

  // --- Page: Apply (#/apply) ---
  function renderApply() {
    document.title = 'Apply - imd/acc';
    const f = state.applyForm;

    const panelQ = f.project && f.name && f.url && f.rate
      ? `imd/acc listing review: Is project ${f.project} (${f.name}) at ${f.url} a genuine trading pool/contract with fee >= cashback rate (${f.rate} bps)?`
      : 'imd/acc listing review: Fill out the application form to generate the exact oracle question.';

    appRoot.innerHTML = `
      <div class="page-view">
        <div class="page-header-block">
          <div class="page-tag">On-Chain Registry &middot; ${DATA_BLOCK_TEXT}</div>
          <h1 class="page-title">Apply for Project Listing</h1>
          <p class="page-desc">List your project on the ownerless ProjectRegistry so your traders' cashback credits earn points.</p>
        </div>

        <div class="app-grid">
          <div class="dashboard-card">
            <h3 class="card-title" style="margin-bottom: 20px;">Application Form</h3>

            <div class="form-group">
              <label class="form-label" for="apply-project">Contract Address</label>
              <input type="text" id="apply-project" class="form-input" value="${safe(f.project)}" placeholder="0x...">
              <div id="apply-project-error" class="field-error">${safe(f.errors.project || '')}</div>
            </div>

            <div class="form-group">
              <label class="form-label" for="apply-name">Project Name (1-48 chars)</label>
              <input type="text" id="apply-name" class="form-input" value="${safe(f.name)}" placeholder="e.g. PLEA v11">
              <div id="apply-name-error" class="field-error">${safe(f.errors.name || '')}</div>
            </div>

            <div class="form-group">
              <label class="form-label" for="apply-url">Verified Source URL (https://)</label>
              <input type="text" id="apply-url" class="form-input" value="${safe(f.url)}" placeholder="https://github.com/...">
              <div id="apply-url-error" class="field-error">${safe(f.errors.url || '')}</div>
            </div>

            <div class="form-group">
              <label class="form-label" for="apply-rate">Cashback Rate (25 to 100 bps)</label>
              <input type="number" id="apply-rate" class="form-input" value="${safe(f.rate)}" placeholder="50">
              <div id="apply-rate-error" class="field-error">${safe(f.errors.rate || '')}</div>
            </div>

            <div class="form-group">
              <label class="form-label" for="apply-beneficiary">Beneficiary Address</label>
              <input type="text" id="apply-beneficiary" class="form-input" value="${safe(f.beneficiary)}" placeholder="0x...">
              <div id="apply-beneficiary-error" class="field-error">${safe(f.errors.beneficiary || '')}</div>
            </div>

            <div style="display: flex; gap: 10px; flex-wrap: wrap; margin-top: 20px;">
              <button class="btn btn-secondary btn-sm" id="btn-get-feetoken">Get 10 test IMD</button>
              <button class="btn btn-secondary btn-sm" id="btn-approve-fee">Approve fee</button>
              <button class="btn btn-primary btn-sm" id="btn-apply-listing">Apply for listing</button>
            </div>
            <div id="step-apply-disabled" class="disabled-reason">
              ${!f.mintedFeeToken ? 'Need 0.5 test IMD fee token to apply.' : !f.approvedFee ? 'Approve 0.5 test IMD fee to registry.' : ''}
            </div>

            <!-- Panel Preview -->
            <div id="apply-panel" style="margin-top: 24px;">
              <label class="form-label">Oracle Panel Question Preview</label>
              <div class="code-container" style="margin-top: 6px;">
                <pre class="code-block" style="font-size: 0.8rem;"><code>${safe(panelQ)}</code></pre>
              </div>
            </div>
          </div>

          <!-- Open Questions & Recent Outcomes -->
          <div class="test-tools-box">
            <div class="dashboard-card" style="padding: 24px;">
              <h3 class="card-title" style="margin-bottom: 14px;">Open Questions</h3>
              <div style="display: flex; flex-direction: column; gap: 12px;">
                ${Object.values(state.appliedProjects).map(ap => `
                  <div style="border-bottom: 1px solid var(--border-subtle); padding-bottom: 8px;">
                    <strong>${safe(ap.name)}</strong> (${safe(ap.state)})<br>
                    <span class="secondary mono" style="font-size: 0.78rem;">${shortAddr(ap.address)}</span>
                  </div>
                `).join('')}
                <div style="border-bottom: 1px solid var(--border-subtle); padding-bottom: 8px;">
                  <strong>TestIMD Hook</strong> (Applied)<br>
                  <span class="secondary mono" style="font-size: 0.78rem;">0x2b69...1e82 &middot; 12 min ago</span>
                </div>
              </div>

              <h3 class="card-title" style="margin-top: 24px; margin-bottom: 12px;">Recent Outcomes</h3>
              <p class="secondary" style="font-size: 0.84rem; line-height: 1.6;">
                &bull; SelfCredit trial: Rejected (negative test case)<br>
                &bull; TestSIMD Pool: Defended (bond to beneficiary)
              </p>
            </div>
          </div>
        </div>
      </div>
    `;

    function validate(id, val) {
      val = (val || '').trim();
      if (id === 'project') {
        if (!/^0x[a-fA-F0-9]{40}$/.test(val)) return 'not an address';
        if (val.toLowerCase() === '0x0000000000000000000000000000000000000001') return 'no contract code';
        if (val.toLowerCase() === ADDRESSES.TEST_SIMD.toLowerCase()) return 'Already listed';
        if (val.toLowerCase() === ADDRESSES.TEST_IMD.toLowerCase()) return 'This project already has an open question';
      }
      if (id === 'name') {
        if (!val) return 'name is required';
        if (val.length > 48) return 'name too long (maximum 48 characters)';
        if (val.includes('"')) return 'disallowed character: double quote';
        if (val.includes('\\')) return 'disallowed character: backslash';
        if (/[[\]]/.test(val)) return 'disallowed character: square bracket';
        if (/[^\x20-\x7E]/.test(val)) return 'disallowed character: non-ASCII';
      }
      if (id === 'url') {
        if (!val.startsWith('https://')) return 'URL must start with https://';
        if (val.length < 12) return 'URL too short (minimum 12 characters)';
        if (val.length > 200) return 'URL too long (maximum 200 characters)';
      }
      if (id === 'rate') {
        const r = parseInt(val, 10);
        if (isNaN(r) || r < 25 || r > 100) return 'rate must be between 25 to 100 bps';
      }
      if (id === 'beneficiary') {
        if (!/^0x[a-fA-F0-9]{40}$/.test(val)) return 'not an address';
        if (val.toLowerCase() === '0x0000000000000000000000000000000000000000') return 'beneficiary cannot be zero address';
      }
      return '';
    }

    ['project', 'name', 'url', 'rate', 'beneficiary'].forEach((id) => {
      const el = document.getElementById(`apply-${id}`);
      const errEl = document.getElementById(`apply-${id}-error`);
      if (el) {
        if (f.errors[id]) {
          el.setAttribute('aria-invalid', 'true');
        }
        el.addEventListener('blur', () => {
          const err = validate(id, el.value);
          f.errors[id] = err;
          f[id] = el.value;
          if (err) {
            errEl.textContent = err;
            el.setAttribute('aria-invalid', 'true');
          } else {
            errEl.textContent = '';
            el.removeAttribute('aria-invalid');
          }
        });
      }
    });

    document.getElementById('btn-get-feetoken')?.addEventListener('click', () => {
      f.mintedFeeToken = true;
      showToast('Minted 10 test IMD fee token!');
      renderApply();
    });

    document.getElementById('btn-approve-fee')?.addEventListener('click', () => {
      f.approvedFee = true;
      showToast('Approved fee for ProjectRegistry!');
      renderApply();
    });

    document.getElementById('btn-apply-listing')?.addEventListener('click', () => {
      let hasErr = false;
      ['project', 'name', 'url', 'rate', 'beneficiary'].forEach((id) => {
        const val = document.getElementById(`apply-${id}`)?.value || '';
        const err = validate(id, val);
        f.errors[id] = err;
        if (err) hasErr = true;
      });
      if (hasErr) {
        renderApply();
        return;
      }

      state.appliedProjects[f.project.toLowerCase()] = {
        address: f.project,
        name: f.name,
        state: 'Applied',
        rateBps: parseInt(f.rate, 10),
        beneficiary: f.beneficiary,
        chain: 'Sepolia Testnet',
        feeFunding: 'Contract fee split',
        history: ['Applied'],
        openQuestion: {
          kind: 'Listing Application',
          age: 'just now',
          asker: shortAddr(state.account || '0xa987ef2aa4d2c0558cc6405f1a8253507274dc5d')
        },
        isRegistered: true
      };

      showToast('Application submitted to ProjectRegistry!');
      renderApply();
    });
  }

  // --- Page: Leaderboard (#/leaderboard) ---
  function renderLeaderboard() {
    document.title = 'Leaderboard - imd/acc';

    appRoot.innerHTML = `
      <div class="page-view">
        <div class="page-header-block">
          <div class="page-tag">Cumulative Points &middot; ${DATA_BLOCK_TEXT}</div>
          <h1 class="page-title">Leaderboards</h1>
          <p class="page-desc">Points are earned at 1 point per IMD stacked across all listed participating projects.</p>
        </div>

        <div class="grid-2">
          <div class="dashboard-card">
            <h3 class="card-title" style="margin-bottom: 16px;">Top Stackers</h3>
            <div class="projects-table-wrap">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Rank</th>
                    <th>Trader</th>
                    <th>Points</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td><strong>#1</strong></td>
                    <td><span class="mono">0x71C8...3B19</span></td>
                    <td><strong class="mono" style="color: var(--accent-light);">1,450.00</strong></td>
                  </tr>
                  <tr>
                    <td><strong>#2</strong></td>
                    <td><span class="mono">0x882a...98e1</span></td>
                    <td><strong class="mono" style="color: var(--accent-light);">980.00</strong></td>
                  </tr>
                  <tr>
                    <td><strong>#3</strong></td>
                    <td><span class="mono">0x4b91...6821</span></td>
                    <td><strong class="mono" style="color: var(--accent-light);">320.00</strong></td>
                  </tr>
                  ${state.account ? `
                    <tr style="background: var(--bg-elevated);">
                      <td>-</td>
                      <td><span class="mono">${shortAddr(state.account)}</span> (You)</td>
                      <td><strong class="mono" style="color: var(--accent-light);">${state.mockBalances.points.toFixed(2)}</strong></td>
                    </tr>
                  ` : ''}
                </tbody>
              </table>
            </div>
          </div>

          <div class="dashboard-card">
            <h3 class="card-title" style="margin-bottom: 16px;">Top Projects by Volume</h3>
            <div class="projects-table-wrap">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Project</th>
                    <th>IMD Stacked</th>
                    <th>Traders</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td><strong>PLEA</strong> (v10 Hook)</td>
                    <td class="mono" style="color: var(--accent-light);">124,500 IMD</td>
                    <td class="mono">42</td>
                  </tr>
                  <tr>
                    <td><strong>PondPad</strong> (Planned)</td>
                    <td class="mono">0 IMD</td>
                    <td class="mono">0</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  // --- Page: Contracts (#/contracts) ---
  function renderContracts() {
    document.title = 'Contracts - imd/acc';

    appRoot.innerHTML = `
      <div class="page-view">
        <div class="page-header-block">
          <div class="page-tag">Smart Contract Architecture &middot; ${DATA_BLOCK_TEXT}</div>
          <h1 class="page-title">Verified Deployments</h1>
          <p class="page-desc">Ownerless and verified smart contracts powering the imd/acc cashback network.</p>
        </div>

        <div class="contracts-grid">
          <div class="contract-card">
            <div class="contract-card-header">
              <span class="contract-name">Stacker v2</span>
              <span class="pill pill-live">Sepolia</span>
            </div>
            <div class="address-row">
              <span class="address-text">${ADDRESSES.STACKER}</span>
              <button class="btn btn-secondary btn-sm copy-btn" data-clipboard="${ADDRESSES.STACKER}">Copy</button>
            </div>
            <p class="secondary" style="font-size: 0.8rem;">The cashback funnel. Pulls IMD and deposits into vault.</p>
          </div>

          <div class="contract-card">
            <div class="contract-card-header">
              <span class="contract-name">ProjectRegistry</span>
              <span class="pill pill-live">Sepolia</span>
            </div>
            <div class="address-row">
              <span class="address-text">${ADDRESSES.PROJECT_REGISTRY}</span>
              <button class="btn btn-secondary btn-sm copy-btn" data-clipboard="${ADDRESSES.PROJECT_REGISTRY}">Copy</button>
            </div>
            <p class="secondary" style="font-size: 0.8rem;">Decides which projects earn points via oracle panel.</p>
          </div>

          <div class="contract-card">
            <div class="contract-card-header">
              <span class="contract-name">TestIMD</span>
              <span class="pill pill-live">Sepolia</span>
            </div>
            <div class="address-row">
              <span class="address-text">${ADDRESSES.TEST_IMD}</span>
              <button class="btn btn-secondary btn-sm copy-btn" data-clipboard="${ADDRESSES.TEST_IMD}">Copy</button>
            </div>
            <p class="secondary" style="font-size: 0.8rem;">10,000 tIMD/24h faucet token.</p>
          </div>

          <div class="contract-card">
            <div class="contract-card-header">
              <span class="contract-name">TestSIMD Vault</span>
              <span class="pill pill-live">Sepolia</span>
            </div>
            <div class="address-row">
              <span class="address-text">${ADDRESSES.TEST_SIMD}</span>
              <button class="btn btn-secondary btn-sm copy-btn" data-clipboard="${ADDRESSES.TEST_SIMD}">Copy</button>
            </div>
            <p class="secondary" style="font-size: 0.8rem;">ERC-4626 staking vault for test run.</p>
          </div>

          <div class="contract-card">
            <div class="contract-card-header">
              <span class="contract-name">Mainnet IMD (OFT)</span>
              <span class="pill pill-planned">Mainnet</span>
            </div>
            <div class="address-row">
              <span class="address-text">${ADDRESSES.MAINNET_IMD}</span>
              <button class="btn btn-secondary btn-sm copy-btn" data-clipboard="${ADDRESSES.MAINNET_IMD}">Copy</button>
            </div>
            <p class="secondary" style="font-size: 0.8rem;">LayerZero OFT ERC-20 token with zero transfer fee.</p>
          </div>

          <div class="contract-card">
            <div class="contract-card-header">
              <span class="contract-name">Mainnet sIMD Vault</span>
              <span class="pill pill-planned">Mainnet</span>
            </div>
            <div class="address-row">
              <span class="address-text">${ADDRESSES.MAINNET_SIMD}</span>
              <button class="btn btn-secondary btn-sm copy-btn" data-clipboard="${ADDRESSES.MAINNET_SIMD}">Copy</button>
            </div>
            <p class="secondary" style="font-size: 0.8rem;">ERC-4626 vault. Owner renounced to 0x0.</p>
          </div>
        </div>

        <div class="code-container">
          <div class="code-header">
            <span class="code-title">Integration Snippet &middot; Uniswap v4 Hook</span>
            <button class="btn btn-secondary btn-sm copy-btn" data-clipboard-target="#hook-code">Copy Solidity</button>
          </div>
          <pre class="code-block" id="hook-code"><code>// 1. Once during contract setup: approve the immutable Stacker
IERC20(imd).approve(address(stacker), type(uint256).max);

// 2. Inside afterSwap: take 25-100 bps from your existing trade fee
uint256 cashback = imdSideAmount * RATE_BPS / 10_000;

// 3. Credit trader directly; always handle fallback so the trade NEVER reverts
try stacker.credit(trader, cashback) {
    // Success: trader now holds sIMD shares earning yield!
} catch {
    // Fallback: send plain IMD directly to the trader
    IERC20(imd).transfer(trader, cashback);
}</code></pre>
        </div>
      </div>
    `;
  }

  // --- Page: Docs (#/docs) ---
  function renderDocs() {
    document.title = 'Docs - imd/acc';

    appRoot.innerHTML = `
      <div class="page-view">
        <div class="page-header-block">
          <div class="page-tag">Developer Spec & Guidelines</div>
          <h1 class="page-title">The 7 Rules of Integration</h1>
          <p class="page-desc">Key principles every project hook must follow to safely participate in imd/acc.</p>
        </div>

        <div class="docs-grid">
          <div class="doc-rule-card">
            <span class="rule-number">1</span>
            <div class="rule-content">
              <h4>Fund From Your Existing Fee</h4>
              <p>Pick a rate between 0.25% and 1.0% (25-100 bps) and deduct it on the IMD side of your existing fee. Never charge extra fees to traders.</p>
            </div>
          </div>

          <div class="doc-rule-card">
            <span class="rule-number">2</span>
            <div class="rule-content">
              <h4>Never Break a Trade</h4>
              <p>Always wrap <code>stacker.credit()</code> in a <code>try / catch</code> block. If the call fails for any reason, transfer plain IMD to the trader.</p>
            </div>
          </div>

          <div class="doc-rule-card">
            <span class="rule-number">3</span>
            <div class="rule-content">
              <h4>Credit The Real Trader</h4>
              <p>Read the trader address from router <code>hookData</code>, fall back to <code>sender</code>, and never use <code>tx.origin</code>.</p>
            </div>
          </div>

          <div class="doc-rule-card">
            <span class="rule-number">4</span>
            <div class="rule-content">
              <h4>Check Gas Upfront</h4>
              <p>Ensure the swap has sufficient gas for <code>credit()</code> before executing, preventing wallets from estimating cheap paths without cashback.</p>
            </div>
          </div>

          <div class="doc-rule-card">
            <span class="rule-number">5</span>
            <div class="rule-content">
              <h4>Budget the Gas Cost</h4>
              <p>Mainnet credit costs ~130k gas for a new trader and ~96k for repeat traders. Wallets should send estimates &times; 1.3.</p>
            </div>
          </div>

          <div class="doc-rule-card">
            <span class="rule-number">6</span>
            <div class="rule-content">
              <h4>Uniswap v4 Whitelist</h4>
              <p>Include standard <code>afterSwap</code> logic that frontend whitelisting expects, support router <code>msgSender</code>, and guard copycat pools.</p>
            </div>
          </div>

          <div class="doc-rule-card">
            <span class="rule-number">7</span>
            <div class="rule-content">
              <h4>Test Failure Paths</h4>
              <p>Test your fallback on Sepolia using TestSIMD's pausing function to ensure your hook gracefully falls back to plain IMD.</p>
            </div>
          </div>
        </div>

        <div style="text-align: center; margin-top: 36px; display: flex; gap: 12px; justify-content: center;">
          <a href="./llms.txt" target="_blank" class="btn btn-secondary">
            <span>View llms.txt Agent Spec</span>
          </a>
          <a href="https://github.com/khaed1/imd-acc/blob/main/README.md" target="_blank" rel="noopener noreferrer" class="btn btn-secondary">
            <span>Read Full GitHub Documentation</span>
          </a>
        </div>
      </div>
    `;
  }

  // --- Page: 404 Not Found ---
  function renderNotFound() {
    document.title = 'Page Not Found - imd/acc';

    appRoot.innerHTML = `
      <div class="page-view" style="text-align: center; padding: 60px 0;">
        <h1 class="page-title">Page Not Found</h1>
        <p class="secondary" style="margin-bottom: 24px;">The route you navigated to does not exist.</p>
        <a href="#/" class="btn btn-primary">&larr; Return to Overview</a>
      </div>
    `;
  }

  // --- Common Listeners ---
  function initCommonListeners() {
    document.querySelectorAll('.copy-btn').forEach(btn => {
      btn.onclick = () => {
        const text = btn.getAttribute('data-clipboard') ||
          (btn.getAttribute('data-clipboard-target') &&
           document.querySelector(btn.getAttribute('data-clipboard-target'))?.innerText);
        if (text) {
          navigator.clipboard.writeText(text.trim()).then(() => showToast('Copied to clipboard!'));
        }
      };
    });
  }

  // --- Global Init ---
  function init() {
    applyTheme(state.theme);

    // Theme Toggle
    document.getElementById('theme-toggle')?.addEventListener('click', () => {
      applyTheme(state.theme === 'dark' ? 'light' : 'dark');
    });

    // Mobile Menu Toggle
    const mobileBtn = document.getElementById('mobile-toggle');
    const navMenu = document.getElementById('nav-menu');
    mobileBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = navMenu?.classList.toggle('open');
      mobileBtn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    });

    document.addEventListener('click', (e) => {
      if (navMenu?.classList.contains('open') && !navMenu.contains(e.target) && !mobileBtn?.contains(e.target)) {
        navMenu.classList.remove('open');
        mobileBtn?.setAttribute('aria-expanded', 'false');
      }
    });

    // Wallet Connect
    const btnWallet = document.getElementById('btn-wallet');
    btnWallet?.addEventListener('click', async () => {
      if (typeof window.ethereum === 'undefined') {
        showToast('No Web3 wallet detected. Exploring in demo mode!');
        return;
      }
      try {
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        if (accounts && accounts[0]) {
          state.account = accounts[0];
          document.getElementById('wallet-label').textContent = shortAddr(state.account);
          btnWallet.classList.remove('btn-secondary');
          btnWallet.classList.add('btn-primary');
          showToast(`Connected: ${shortAddr(state.account)}`);
          render();
        }
      } catch (err) {
        showToast('Wallet connection rejected');
      }
    });

    // Hashchange listener
    window.addEventListener('hashchange', render);

    // Initial render
    render();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
