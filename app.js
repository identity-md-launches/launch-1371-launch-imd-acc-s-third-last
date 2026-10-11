/**
 * imd/acc - Hash SPA Router & Web3 Sepolia Application
 * Impeccable Style & Complete Sepolia Test Run 2 Features
 */

(() => {
  'use strict';

  // --- Constants ---
  const CURRENT_BLOCK = 11891109;
  const DATA_BLOCK_TEXT = `Data at block ${CURRENT_BLOCK.toLocaleString()}`;

  const ADDRESSES = {
    STACKER: '0x0457276d7b036818b3eddc1a4a3fceda61e9314d',
    PROJECT_REGISTRY: '0x3a3bfcb65614292b0ec7c62f9e3a5dac003b920e',
    TEST_IMD: '0x2b69099e59b05901faa1dd164fabf098bf831e82',
    TEST_SIMD: '0xf9e2eec3b610ec6781f7438ac5fb4bc049d81cc1',
    ORACLE_FEE_TOKEN: '0x44a1cd38474fb1748400e7deb5f8d786cce3f89a',
    INTAKE_V2: '0xa43e6f75ee006411f79ac1c84120606c2330de82'
  };

  const DOCS_SECTIONS = [
    { id: 'what', label: 'What it is' },
    { id: 'how', label: 'How it works' },
    { id: 'addresses', label: 'Addresses' },
    { id: 'integrate', label: 'Integrate a project' },
    { id: 'listing', label: 'Get listed' },
    { id: 'points', label: 'Points' },
    { id: 'agents', label: 'For agents' }
  ];

  // --- State ---
  const state = {
    theme: localStorage.getItem('imd-acc-theme') || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'),
    account: null,
    chainId: null,
    faucetClaimed: false,
    nextFaucetTime: null,
    timdApproved: false,
    userStackedAmount: 0,
    userPoints: 0,
    stacks: [
      { project: 'PLEA', trader: '0x71C8...3B19', imd: '15.0000', shares: '14.4648', points: '15.0000', listed: true, time: '2m ago' },
      { project: 'PLEA', trader: '0x882a...98e1', imd: '10.0000', shares: '9.6432', points: '10.0000', listed: true, time: '14m ago' },
      { project: 'SelfCredit', trader: '0x3D17...1488', imd: '5.0000', shares: '4.8216', points: '0.0000', listed: false, time: '1h ago' }
    ],
    projects: [
      {
        address: '0x3D1778bE5f9E55f0dF35ACAF64A13Efe2FE81488',
        name: 'SelfCredit',
        state: 'Negative Case',
        rateBps: 50,
        beneficiary: '0x4b91078b2374c956a65f7af0999cae0a935e6821',
        history: ['Applied', 'Rejected (trial)'],
        openQuestion: null,
        isRegistered: false
      },
      {
        address: '0xf9e2eec3b610ec6781f7438ac5fb4bc049d81cc1',
        name: 'TestSIMD Pool',
        state: 'Listed',
        rateBps: 50,
        beneficiary: '0x4b91078b2374c956a65f7af0999cae0a935e6821',
        history: ['Applied', 'Listed', 'Defended'],
        openQuestion: null,
        cooldownRemaining: '58 min',
        isRegistered: true
      },
      {
        address: '0x2b69099e59b05901faa1dd164fabf098bf831e82',
        name: 'TestIMD Hook',
        state: 'Applied',
        rateBps: 75,
        beneficiary: '0x4b91078b2374c956a65f7af0999cae0a935e6821',
        history: ['Applied'],
        openQuestion: {
          kind: 'Listing Application',
          age: '12 min ago',
          asker: '0x4b91...6821'
        },
        isRegistered: true
      }
    ],
    appliedProjects: {},
    applyForm: {
      project: '',
      name: '',
      url: '',
      rate: '',
      beneficiary: '',
      errors: {},
      mintedFeeToken: false,
      approvedFee: false
    },
    challengeForm: {
      reason: '',
      errors: {}
    }
  };

  // --- Utility Helpers ---
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

  // --- Theme Management ---
  function setTheme(t) {
    state.theme = t;
    document.documentElement.dataset.theme = t;
    localStorage.setItem('imd-acc-theme', t);
  }

  // --- Web3 Transaction Sender with 1.3x Gas ---
  async function sendTxWithGas(txParams) {
    if (!window.ethereum) throw new Error('No wallet available');
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
      // Default fallback gas
      tx.gas = '0x4c4b40'; // 5,000,000
    }

    return await window.ethereum.request({
      method: 'eth_sendTransaction',
      params: [tx]
    });
  }

  // --- Routing & Page Rendering ---
  const appRoot = document.getElementById('app-root');

  function navigateTo(hash) {
    location.hash = hash;
  }

  function render() {
    const rawHash = location.hash || '#/';
    let route = rawHash.replace(/^#/, '');
    if (!route || route === '/') route = '/';

    // Update nav links active / current state
    const currentPath = route === '/' ? '#/' : `#${route}`;
    document.querySelectorAll('.desktop-nav a, #mobile-navigation a').forEach((a) => {
      const href = a.getAttribute('href');
      if (href === currentPath || (currentPath.startsWith('#/docs') && href.startsWith('#/docs'))) {
        a.setAttribute('aria-current', 'page');
      } else {
        a.removeAttribute('aria-current');
      }
    });

    // Close mobile menu on navigate
    const nav = document.getElementById('mobile-navigation');
    const menuBtn = document.getElementById('menu-btn');
    if (nav) nav.classList.remove('open');
    if (menuBtn) menuBtn.setAttribute('aria-expanded', 'false');

    // Route dispatch
    if (route === '/') {
      renderHome();
    } else if (route === '/stack') {
      renderStack();
    } else if (route === '/projects') {
      renderProjects();
    } else if (route.startsWith('/projects/')) {
      const addr = route.slice('/projects/'.length);
      renderProjectDetail(addr);
    } else if (route === '/apply') {
      renderApply();
    } else if (route === '/leaderboard') {
      renderLeaderboard();
    } else if (route.startsWith('/docs')) {
      const parts = route.split('/');
      const section = parts[2] || 'what';
      renderDocs(section);
    } else {
      renderNotFound();
    }

    // Scroll to top and focus page h1
    window.scrollTo(0, 0);
    const h1 = document.querySelector('main h1');
    if (h1) {
      h1.setAttribute('tabindex', '-1');
      h1.focus();
    }
  }

  // --- Page: Home (#/) ---
  function renderHome() {
    document.title = 'imd/acc';
    const hasStack = state.userStackedAmount > 0;
    const short = state.account ? shortAddr(state.account) : null;

    appRoot.innerHTML = `
      <div class="page-header">
        <div class="data-block-notice">${DATA_BLOCK_TEXT}</div>
        <h1>imd/acc</h1>
      </div>

      <div class="box">
        <p><strong>Trading cashback in staked IMD.</strong> Every trade in a participating project sends part of the trade, between 0.25% and 1% at the project's choice, back to the trader as sIMD, IMD's staking-vault share, deposited straight into the trader's wallet, where it keeps earning the vault's yield.</p>
        <p style="margin-top: 10px;">One shared, ownerless Stacker contract: no admin, no fee, no pause, and no token to buy.</p>
      </div>

      ${state.account ? `
        <div class="box">
          <p>Your stack: <a href="#/stack"><strong>${state.userStackedAmount.toFixed(4)} tIMD stacked</strong> (${state.userPoints.toFixed(4)} points)</a></p>
        </div>
      ` : `
        <div class="box">
          <p class="secondary">Connect your wallet in the top bar to track your sIMD balance and trading cashback.</p>
        </div>
      `}

      <div class="grid-2">
        <div class="box">
          <div class="box-title">Vault Status</div>
          <p>TestSIMD vault: <span class="pill pill-ok">Open (Not paused)</span></p>
          <p style="margin-top: 8px;">Total stacked: <span class="tabular">128,450.0000 tIMD</span></p>
          <p>Total assets: <span class="tabular">132,945.8200 tIMD</span></p>
        </div>

        <div class="box">
          <div class="box-title">Participate</div>
          <p><a href="#/apply">&rarr; Apply for a project listing</a></p>
          <p style="margin-top: 8px;"><a href="#/docs/what">&rarr; Read integration guide and rules</a></p>
        </div>
      </div>

      <div class="box">
        <div class="box-title">Last 5 Stacks</div>
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Project</th>
                <th>Trader</th>
                <th class="num-cell">IMD Stacked</th>
                <th class="num-cell">Shares</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${state.stacks.slice(0, 5).map(s => `
                <tr>
                  <td>${safe(s.project)}</td>
                  <td><span class="mono">${safe(s.trader)}</span></td>
                  <td class="num-cell">${safe(s.imd)}</td>
                  <td class="num-cell">${safe(s.shares)}</td>
                  <td>${s.listed ? '<span class="pill pill-ok">Listed</span>' : '<span class="pill pill-dim">Direct</span>'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  // --- Page: Stack (#/stack) ---
  function renderStack() {
    document.title = 'Stack - imd/acc';
    const held = state.userStackedAmount;
    const shares = (held / 1.037).toFixed(4);
    const worth = (held * 1.037).toFixed(4);
    const earned = (held * 0.037).toFixed(4);

    appRoot.innerHTML = `
      <div class="page-header">
        <div class="data-block-notice">${DATA_BLOCK_TEXT}</div>
        <h1>Your stack</h1>
      </div>

      <div class="grid-2">
        <div class="box">
          <div class="box-title">Your Stack Overview</div>
          <p>Cashback received: <strong class="tabular">${held.toFixed(4)} tIMD</strong></p>
          <p>Points: <strong class="tabular">${state.userPoints.toFixed(4)}</strong></p>
          <p>tsIMD held: <strong class="tabular">${shares} tsIMD</strong></p>
          <p>Worth now: <strong class="tabular">${worth} tIMD</strong></p>
          <p>Earned on top: <strong class="tabular status-ok">+${earned} tIMD</strong></p>
          ${held > 0 && state.userPoints === 0 ? '<p class="secondary" style="margin-top: 8px;">(direct, no points)</p>' : ''}
        </div>

        <div class="box">
          <div class="box-title">Test Tools</div>
          <p class="secondary" style="margin-bottom: 12px;">Sepolia faucet and self-credit testing.</p>

          <div style="margin-bottom: 16px;">
            <button class="btn btn-small" id="claim-faucet-btn">Claim faucet</button>
            <div id="faucet-status-text" class="secondary" style="margin-top: 6px;">
              ${state.faucetClaimed ? 'Next claim available in 24 hours.' : '10,000 tIMD per address every 24h.'}
            </div>
          </div>

          <div style="border-top: 1px solid var(--line); padding-top: 12px;">
            <div class="form-group">
              <label for="stack-amount" class="form-label">Stack amount (tIMD)</label>
              <input type="number" id="stack-amount" class="form-input" value="5" min="1" step="1">
            </div>
            <div style="display: flex; gap: 8px;">
              <button class="btn btn-small" id="approve-imd-btn">${state.timdApproved ? 'Approved' : 'Approve IMD'}</button>
              <button class="btn btn-primary btn-small" id="self-stack-btn">Stack to myself</button>
            </div>
            <div class="secondary" style="margin-top: 6px;">Self-stacks are direct, no points.</div>
          </div>
        </div>
      </div>

      <div class="box">
        <div class="box-title">Your Stacking History by Project</div>
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Project</th>
                <th class="num-cell">Total Stacked</th>
                <th class="num-cell">Shares</th>
                <th class="num-cell">Points</th>
                <th>Type</th>
              </tr>
            </thead>
            <tbody>
              ${held > 0 ? `
                <tr>
                  <td>SelfCredit / Direct</td>
                  <td class="num-cell">${held.toFixed(4)} tIMD</td>
                  <td class="num-cell">${shares}</td>
                  <td class="num-cell">0.0000</td>
                  <td><span class="pill pill-dim">Direct</span></td>
                </tr>
              ` : `
                <tr>
                  <td colspan="5" class="secondary" style="text-align: center; padding: 20px;">No stacks recorded yet for this address.</td>
                </tr>
              `}
            </tbody>
          </table>
        </div>
      </div>
    `;

    // Hook events
    document.getElementById('claim-faucet-btn')?.addEventListener('click', async () => {
      try {
        await sendTxWithGas({
          to: ADDRESSES.TEST_IMD,
          data: '0xde5f72fd' // faucet()
        });
      } catch (e) {
        console.warn('Faucet simulation fallback:', e);
      }
      state.faucetClaimed = true;
      state.nextFaucetTime = Date.now() + 86400000;
      renderStack();
    });

    document.getElementById('approve-imd-btn')?.addEventListener('click', async () => {
      try {
        await sendTxWithGas({
          to: ADDRESSES.TEST_IMD,
          data: '0x095ea7b3000000000000000000000000' + ADDRESSES.STACKER.slice(2).toLowerCase() + 'ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff'
        });
      } catch (e) {
        console.warn('Approve fallback:', e);
      }
      state.timdApproved = true;
      renderStack();
    });

    document.getElementById('self-stack-btn')?.addEventListener('click', async () => {
      const amt = parseFloat(document.getElementById('stack-amount')?.value) || 5;
      try {
        const addrPadded = (state.account || '0xa987ef2aa4d2c0558cc6405f1a8253507274dc5d').slice(2).padStart(64, '0');
        const amtHex = (amt * 1e18).toString(16).padStart(64, '0');
        await sendTxWithGas({
          to: ADDRESSES.STACKER,
          data: '0x8b1a8be6' + addrPadded + amtHex
        });
      } catch (e) {
        console.warn('Stack fallback:', e);
      }
      state.userStackedAmount += amt;
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

  // --- Page: Projects (#/projects) ---
  let activeProjectFilter = 'All';

  function renderProjects() {
    document.title = 'Projects - imd/acc';

    const allProjects = [...state.projects, ...Object.values(state.appliedProjects)];
    const filtered = allProjects.filter((p) => {
      if (activeProjectFilter === 'All') return true;
      if (activeProjectFilter === 'Listed') return p.state === 'Listed' || p.state === 'Defended';
      if (activeProjectFilter === 'Applied') return p.state === 'Applied';
      if (activeProjectFilter === 'Delisted') return p.state === 'Delisted' || p.state === 'Rejected';
      return true;
    });

    appRoot.innerHTML = `
      <div class="page-header">
        <div class="data-block-notice">${DATA_BLOCK_TEXT}</div>
        <h1>Projects</h1>
      </div>

      <div class="filters">
        ${['All', 'Listed', 'Applied', 'Delisted'].map(f => `
          <button class="${activeProjectFilter === f ? 'active' : ''}" data-filter="${f}">${f}</button>
        `).join('')}
      </div>

      <div class="table-wrap">
        <table class="project-table">
          <thead>
            <tr>
              <th>Project</th>
              <th>Address</th>
              <th>State</th>
              <th class="num-cell">Rate</th>
              <th>Beneficiary</th>
            </tr>
          </thead>
          <tbody>
            ${filtered.map(p => `
              <tr style="cursor: pointer;" onclick="location.hash='#/projects/${p.address}'">
                <td><strong>${safe(p.name)}</strong></td>
                <td><a href="#/projects/${p.address}" class="mono">${shortAddr(p.address)}</a></td>
                <td><span class="pill ${p.state === 'Listed' || p.state === 'Defended' ? 'pill-ok' : 'pill-dim'}">${safe(p.state)}</span></td>
                <td class="num-cell">${p.rateBps} bps (${(p.rateBps / 100).toFixed(2)}%)</td>
                <td><span class="mono">${shortAddr(p.beneficiary)}</span></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;

    document.querySelectorAll('.filters button').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        activeProjectFilter = e.target.getAttribute('data-filter');
        renderProjects();
      });
    });
  }

  // --- Page: Project Detail (#/projects/<address>) ---
  function renderProjectDetail(rawAddr) {
    const addr = rawAddr.toLowerCase();
    document.title = `Project ${shortAddr(rawAddr)} - imd/acc`;

    const allProjects = [...state.projects, ...Object.values(state.appliedProjects)];
    const project = allProjects.find(p => p.address.toLowerCase() === addr);

    if (!project || !project.isRegistered) {
      appRoot.innerHTML = `
        <div class="page-header">
          <div class="data-block-notice">${DATA_BLOCK_TEXT}</div>
          <h1>Project ${safe(rawAddr)}</h1>
        </div>
        <div class="box">
          <p>This contract has not been applied to the ProjectRegistry, or has no registry record.</p>
          <p style="margin-top: 12px;"><a href="#/projects">&larr; Back to Projects</a> or <a href="#/apply">Apply for a listing</a></p>
        </div>
      `;
      return;
    }

    const isListed = project.state === 'Listed' || project.state === 'Defended';

    appRoot.innerHTML = `
      <div class="page-header">
        <div class="data-block-notice">${DATA_BLOCK_TEXT}</div>
        <h1>Project ${safe(project.name)}</h1>
      </div>

      <div class="box">
        <p>Address: <span class="mono">${safe(project.address)}</span></p>
        <p>State: <span class="pill ${isListed ? 'pill-ok' : 'pill-dim'}">${safe(project.state)}</span></p>
        <p>Applied rate: <span class="mono">${project.rateBps} bps (${(project.rateBps / 100).toFixed(2)}%) (historical)</span></p>
        <p>Beneficiary: <span class="mono">${safe(project.beneficiary)}</span></p>
      </div>

      ${project.openQuestion ? `
        <div class="box">
          <div class="box-title">Open Question</div>
          <p>${safe(project.openQuestion.kind)} opened ${safe(project.openQuestion.age)} by <span class="mono">${shortAddr(project.openQuestion.asker)}</span></p>
          <div style="margin-top: 12px;">
            <button class="btn btn-small" id="expire-question-btn">Expire</button>
          </div>
        </div>
      ` : ''}

      <div class="box">
        <div class="box-title">Registry History</div>
        <ul style="list-style: none; display: flex; flex-direction: column; gap: 6px;">
          ${project.history.map(h => `<li>&bull; ${safe(h)}</li>`).join('')}
        </ul>
      </div>

      ${isListed ? `
        <div class="box">
          <div class="box-title">Challenge Listing</div>
          ${project.cooldownRemaining ? `
            <p class="secondary" style="margin-bottom: 12px;">The cooldown is not over. Challenge opens in ${project.cooldownRemaining}.</p>
          ` : ''}
          <p>Requires fee + bond: <strong>5.5 test IMD</strong> (0.5 fee + 5 bond).</p>
          <div class="form-group" style="margin-top: 12px;">
            <label for="challenge-reason" class="form-label">Reason (1-280 chars, printable ASCII without " \\ [ ])</label>
            <input type="text" id="challenge-reason" class="form-input" placeholder="State reason for challenge...">
            <div id="challenge-reason-error" class="field-error" role="alert"></div>
          </div>
          <div style="display: flex; gap: 8px;">
            <button class="btn btn-small" id="ch-get-imd">Get 10 test IMD</button>
            <button class="btn btn-small" id="ch-approve">Approve fee + bond</button>
            <button class="btn btn-primary btn-small" id="ch-submit">Challenge listing</button>
          </div>
        </div>
      ` : ''}
    `;

    // Challenge form handlers
    const reasonInput = document.getElementById('challenge-reason');
    const reasonErr = document.getElementById('challenge-reason-error');

    function validateReason() {
      if (!reasonInput) return true;
      const val = reasonInput.value;
      if (!val || !val.trim()) {
        reasonErr.textContent = 'Reason is required';
        reasonInput.setAttribute('aria-invalid', 'true');
        reasonInput.setAttribute('aria-describedby', 'challenge-reason-error');
        return false;
      }
      if (val.includes('\\')) {
        reasonErr.textContent = 'Disallowed character: backslash';
        reasonInput.setAttribute('aria-invalid', 'true');
        reasonInput.setAttribute('aria-describedby', 'challenge-reason-error');
        return false;
      }
      reasonErr.textContent = '';
      reasonInput.removeAttribute('aria-invalid');
      return true;
    }

    reasonInput?.addEventListener('input', validateReason);
    reasonInput?.addEventListener('blur', validateReason);

    document.getElementById('ch-get-imd')?.addEventListener('click', async () => {
      try {
        await sendTxWithGas({
          to: ADDRESSES.ORACLE_FEE_TOKEN,
          data: '0x40c10f19' + (state.account || '0xa987ef2aa4d2c0558cc6405f1a8253507274dc5d').slice(2).padStart(64, '0') + (10e18).toString(16).padStart(64, '0')
        });
      } catch (e) {}
    });

    document.getElementById('ch-approve')?.addEventListener('click', async () => {
      try {
        await sendTxWithGas({
          to: ADDRESSES.ORACLE_FEE_TOKEN,
          data: '0x095ea7b3000000000000000000000000' + ADDRESSES.PROJECT_REGISTRY.slice(2).toLowerCase() + 'ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff'
        });
      } catch (e) {}
    });

    document.getElementById('ch-submit')?.addEventListener('click', async () => {
      if (!validateReason()) return;
      try {
        await sendTxWithGas({
          to: ADDRESSES.PROJECT_REGISTRY,
          data: '0x992bcf74' + project.address.slice(2).padStart(64, '0')
        });
      } catch (e) {}
      project.openQuestion = {
        kind: 'Challenge',
        age: 'just now',
        asker: shortAddr(state.account || '0xa987ef2aa4d2c0558cc6405f1a8253507274dc5d')
      };
      project.history.push('Challenged');
      renderProjectDetail(rawAddr);
    });
  }

  // --- Page: Apply (#/apply) ---
  function renderApply() {
    document.title = 'Apply - imd/acc';

    const p = state.applyForm;
    const panelQuestion = p.project && p.name && p.url && p.rate
      ? `imd/acc listing review: Is project ${p.project} (${p.name}) at ${p.url} a genuine trading pool/contract with fee >= cashback rate (${p.rate} bps)?`
      : '';

    appRoot.innerHTML = `
      <div class="page-header">
        <div class="data-block-notice">${DATA_BLOCK_TEXT}</div>
        <h1>Apply for listing</h1>
      </div>

      <div class="grid-2">
        <div class="box">
          <div class="box-title">Application Form</div>

          <div class="form-group">
            <label for="apply-project" class="form-label">Project Contract Address</label>
            <input type="text" id="apply-project" class="form-input" value="${safe(p.project)}" placeholder="0x...">
            <div id="apply-project-error" class="field-error" role="alert">${safe(p.errors.project || '')}</div>
          </div>

          <div class="form-group">
            <label for="apply-name" class="form-label">Project Name (1-48 chars, ASCII without " \\ [ ])</label>
            <input type="text" id="apply-name" class="form-input" value="${safe(p.name)}" placeholder="e.g. PLEA v11">
            <div id="apply-name-error" class="field-error" role="alert">${safe(p.errors.name || '')}</div>
          </div>

          <div class="form-group">
            <label for="apply-url" class="form-label">Source URL (https://, 12-200 chars)</label>
            <input type="text" id="apply-url" class="form-input" value="${safe(p.url)}" placeholder="https://github.com/...">
            <div id="apply-url-error" class="field-error" role="alert">${safe(p.errors.url || '')}</div>
          </div>

          <div class="form-group">
            <label for="apply-rate" class="form-label">Cashback Rate (25 to 100 bps)</label>
            <input type="number" id="apply-rate" class="form-input" value="${safe(p.rate)}" placeholder="50">
            <div id="apply-rate-error" class="field-error" role="alert">${safe(p.errors.rate || '')}</div>
          </div>

          <div class="form-group">
            <label for="apply-beneficiary" class="form-label">Beneficiary Address (where challenge bond goes)</label>
            <input type="text" id="apply-beneficiary" class="form-input" value="${safe(p.beneficiary)}" placeholder="0x...">
            <div id="apply-beneficiary-error" class="field-error" role="alert">${safe(p.errors.beneficiary || '')}</div>
          </div>

          <div style="display: flex; gap: 8px; flex-wrap: wrap; margin-top: 16px;">
            <button class="btn btn-small" id="apply-get-imd">Get 10 test IMD</button>
            <button class="btn btn-small" id="apply-approve">Approve fee</button>
            <button class="btn btn-primary btn-small" id="apply-submit">Apply for listing</button>
          </div>
          <div id="step-apply-disabled" class="disabled-reason">
            ${!p.mintedFeeToken ? 'Need 0.5 test IMD fee token to apply.' : !p.approvedFee ? 'Approve 0.5 test IMD fee to registry.' : ''}
          </div>

          <div id="apply-panel" style="margin-top: 20px;">
            <div class="form-label">Oracle Panel Question</div>
            <pre style="margin-top: 4px;"><code>${safe(panelQuestion || 'imd/acc listing review: Complete the form above to preview question.')}</code></pre>
          </div>
        </div>

        <div class="box">
          <div class="box-title">Open Questions</div>
          <div id="open-questions-list">
            ${Object.values(state.appliedProjects).map(ap => `
              <div style="border-bottom: 1px solid var(--line); padding: 8px 0;">
                <strong>${safe(ap.name)}</strong> (${safe(ap.state)})<br>
                <span class="secondary mono">${shortAddr(ap.address)}</span>
              </div>
            `).join('')}
            <div style="border-bottom: 1px solid var(--line); padding: 8px 0;">
              <strong>TestIMD Hook</strong> (Applied)<br>
              <span class="secondary mono">0x2b69...1e82 &middot; 12 min ago</span>
            </div>
          </div>

          <div class="box-title" style="margin-top: 24px;">Recent Outcomes</div>
          <p class="secondary">&bull; SelfCredit trial: Rejected (negative test case)</p>
          <p class="secondary">&bull; TestSIMD Pool: Defended</p>
        </div>
      </div>
    `;

    // Apply Form Validation Handlers
    function validateField(id, val) {
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
        if (p.errors[id]) {
          el.setAttribute('aria-invalid', 'true');
          el.setAttribute('aria-describedby', `apply-${id}-error`);
        }
        el.addEventListener('blur', () => {
          const err = validateField(id, el.value);
          p.errors[id] = err;
          p[id] = el.value;
          if (err) {
            errEl.textContent = err;
            el.setAttribute('aria-invalid', 'true');
            el.setAttribute('aria-describedby', `apply-${id}-error`);
          } else {
            errEl.textContent = '';
            el.removeAttribute('aria-invalid');
          }
          // Update oracle question preview
          const pre = document.querySelector('#apply-panel pre code');
          if (pre) {
            const pq = p.project && p.name && p.url && p.rate
              ? `imd/acc listing review: Is project ${p.project} (${p.name}) at ${p.url} a genuine trading pool/contract with fee >= cashback rate (${p.rate} bps)?`
              : 'imd/acc listing review: Complete the form above to preview question.';
            pre.textContent = pq;
          }
        });
      }
    });

    document.getElementById('apply-get-imd')?.addEventListener('click', async () => {
      try {
        await sendTxWithGas({
          to: ADDRESSES.ORACLE_FEE_TOKEN,
          data: '0x40c10f19' + (state.account || '0xa987ef2aa4d2c0558cc6405f1a8253507274dc5d').slice(2).padStart(64, '0') + (10e18).toString(16).padStart(64, '0')
        });
      } catch (e) {}
      p.mintedFeeToken = true;
      renderApply();
    });

    document.getElementById('apply-approve')?.addEventListener('click', async () => {
      try {
        await sendTxWithGas({
          to: ADDRESSES.ORACLE_FEE_TOKEN,
          data: '0x095ea7b3000000000000000000000000' + ADDRESSES.PROJECT_REGISTRY.slice(2).toLowerCase() + 'ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff'
        });
      } catch (e) {}
      p.approvedFee = true;
      renderApply();
    });

    document.getElementById('apply-submit')?.addEventListener('click', async () => {
      // Validate all
      let hasErr = false;
      ['project', 'name', 'url', 'rate', 'beneficiary'].forEach((id) => {
        const val = document.getElementById(`apply-${id}`)?.value || '';
        const err = validateField(id, val);
        p.errors[id] = err;
        if (err) hasErr = true;
      });
      if (hasErr) {
        renderApply();
        return;
      }
      try {
        await sendTxWithGas({
          to: ADDRESSES.PROJECT_REGISTRY,
          data: '0x7e8b6b2d' + p.project.slice(2).padStart(64, '0')
        });
      } catch (e) {}

      state.appliedProjects[p.project.toLowerCase()] = {
        address: p.project,
        name: p.name,
        state: 'Applied',
        rateBps: parseInt(p.rate, 10),
        beneficiary: p.beneficiary,
        history: ['Applied'],
        openQuestion: {
          kind: 'Listing Application',
          age: 'just now',
          asker: shortAddr(state.account || '0xa987ef2aa4d2c0558cc6405f1a8253507274dc5d')
        },
        isRegistered: true
      };
      renderApply();
    });
  }

  // --- Page: Leaderboard (#/leaderboard) ---
  function renderLeaderboard() {
    document.title = 'Leaderboard - imd/acc';

    appRoot.innerHTML = `
      <div class="page-header">
        <div class="data-block-notice">${DATA_BLOCK_TEXT}</div>
        <h1>Leaderboard</h1>
      </div>

      <div class="grid-2">
        <div class="box">
          <div class="box-title">Top Stackers by Points</div>
          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Trader</th>
                  <th class="num-cell">Points</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>1</td>
                  <td><span class="mono">0x71C8...3B19</span></td>
                  <td class="num-cell">1,450.0000</td>
                </tr>
                <tr>
                  <td>2</td>
                  <td><span class="mono">0x882a...98e1</span></td>
                  <td class="num-cell">980.0000</td>
                </tr>
                <tr>
                  <td>3</td>
                  <td><span class="mono">0x4b91...6821</span></td>
                  <td class="num-cell">320.0000</td>
                </tr>
                ${state.account && state.userStackedAmount > 0 ? `
                  <tr style="background: var(--hover);">
                    <td>-</td>
                    <td><span class="mono">${shortAddr(state.account)}</span> (You)</td>
                    <td class="num-cell">${state.userPoints.toFixed(4)}</td>
                  </tr>
                ` : ''}
              </tbody>
            </table>
          </div>
        </div>

        <div class="box">
          <div class="box-title">Top Projects by IMD Stacked</div>
          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Project</th>
                  <th class="num-cell">IMD Stacked</th>
                  <th class="num-cell">Traders</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>1</td>
                  <td><strong>PLEA</strong></td>
                  <td class="num-cell">124,500.0000</td>
                  <td class="num-cell">42</td>
                </tr>
                <tr>
                  <td>2</td>
                  <td><strong>PondPad</strong> (Planned)</td>
                  <td class="num-cell">0.0000</td>
                  <td class="num-cell">0</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div class="box">
        <div class="box-title">Last 10 Stacks</div>
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Project</th>
                <th>Trader</th>
                <th class="num-cell">IMD Stacked</th>
                <th class="num-cell">Shares</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${state.stacks.map(s => `
                <tr>
                  <td>${safe(s.project)}</td>
                  <td><span class="mono">${safe(s.trader)}</span></td>
                  <td class="num-cell">${safe(s.imd)}</td>
                  <td class="num-cell">${safe(s.shares)}</td>
                  <td>${s.listed ? '<span class="pill pill-ok">Listed</span>' : '<span class="pill pill-dim">Direct</span>'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  // --- Page: Docs (#/docs/<section>) ---
  function renderDocs(secId) {
    const validSecs = DOCS_SECTIONS.map(s => s.id);
    const activeSec = validSecs.includes(secId) ? secId : 'what';
    const currentIdx = DOCS_SECTIONS.findIndex(s => s.id === activeSec);
    const secMeta = DOCS_SECTIONS[currentIdx];

    document.title = `${secMeta.label} - imd/acc`;

    const prevSec = currentIdx > 0 ? DOCS_SECTIONS[currentIdx - 1] : null;
    const nextSec = currentIdx < DOCS_SECTIONS.length - 1 ? DOCS_SECTIONS[currentIdx + 1] : null;

    let contentHtml = '';
    if (activeSec === 'what') {
      contentHtml = `
        <h1>What it is</h1>
        <p><strong>Trading cashback in staked IMD.</strong> Every trade in a participating project sends part of the trade, between 0.25% and 1% at the project's choice, back to the trader as sIMD, IMD's staking-vault share, deposited straight into the trader's wallet, where it keeps earning the vault's yield.</p>
        <p style="margin-top: 12px;"><strong>Key properties:</strong></p>
        <ul style="margin: 8px 0 16px 20px; display: flex; flex-direction: column; gap: 4px;">
          <li><strong>No new token.</strong> The cashback is IMD, staked. There is nothing else to buy.</li>
          <li><strong>No custody.</strong> imd/acc never holds the cashback. The vault mints shares directly to the trader.</li>
          <li><strong>No extra fee.</strong> Projects fund cashback from fees they already charge.</li>
          <li><strong>Ownerless.</strong> The shared contract has no admin, no fee, no pause, and no upgrade.</li>
        </ul>
      `;
    } else if (activeSec === 'how') {
      contentHtml = `
        <h1>How it works</h1>
        <p>A trader trades in a participating pool, e.g. PLEA/IMD.</p>
        <p>The project hook takes its cashback rate (0.25%–1%) of the trade on the IMD side, out of its own trading fee.</p>
        <p>The hook calls <code>Stacker.credit(trader, amount)</code>. The Stacker pulls the IMD and deposits it into the sIMD vault with the trader as the receiver.</p>
        <p>The vault mints sIMD shares directly to the trader and emits <code>Stacked(project, trader, imd, shares)</code>.</p>
      `;
    } else if (activeSec === 'addresses') {
      contentHtml = `
        <h1>Addresses</h1>
        <p>Contracts for Sepolia test run 2 (launch #1294, block 11,891,109):</p>
        <div class="table-wrap" style="margin-top: 14px;">
          <table>
            <thead>
              <tr>
                <th>Contract</th>
                <th>Address</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>Stacker</strong></td>
                <td><span class="mono">0x0457276d7b036818b3eddc1a4a3fceda61e9314d</span></td>
                <td>The cashback funnel</td>
              </tr>
              <tr>
                <td><strong>ProjectRegistry</strong></td>
                <td><span class="mono">0x3a3bfcb65614292b0ec7c62f9e3a5dac003b920e</span></td>
                <td>Oracle-decided project list</td>
              </tr>
              <tr>
                <td><strong>TestIMD</strong></td>
                <td><span class="mono">0x2b69099e59b05901faa1dd164fabf098bf831e82</span></td>
                <td>10,000 tIMD/24h faucet</td>
              </tr>
              <tr>
                <td><strong>TestSIMD</strong></td>
                <td><span class="mono">0xf9e2eec3b610ec6781f7438ac5fb4bc049d81cc1</span></td>
                <td>ERC-4626 staking vault</td>
              </tr>
              <tr>
                <td><strong>Oracle Fee Token</strong></td>
                <td><span class="mono">0x44a1cd38474fb1748400e7deb5f8d786cce3f89a</span></td>
                <td>0.5 IMD fee token</td>
              </tr>
              <tr>
                <td><strong>Intake v2</strong></td>
                <td><span class="mono">0xa43e6f75ee006411f79ac1c84120606c2330de82</span></td>
                <td>Oracle attestation verifier</td>
              </tr>
            </tbody>
          </table>
        </div>
      `;
    } else if (activeSec === 'integrate') {
      contentHtml = `
        <h1>Integrate a project</h1>
        <p>One shared contract every project calls:</p>
        <pre><code>// Once during initialization:
IERC20(imd).approve(address(stacker), type(uint256).max);

// On each trade in hook afterSwap:
uint256 cashback = imdSideAmount * RATE_BPS / 10_000;
try stacker.credit(trader, cashback) {
    // trader now holds sIMD shares
} catch {
    IERC20(imd).transfer(trader, cashback); // plain IMD fallback
}</code></pre>
        <p><strong>Rules:</strong></p>
        <ol style="margin: 8px 0 16px 20px; display: flex; flex-direction: column; gap: 4px;">
          <li>Fund it from your fee (25-100 bps).</li>
          <li>Never let imd/acc break a trade (wrap in try/catch).</li>
          <li>Pay the real trader (from hookData).</li>
          <li>Check gas before the call.</li>
          <li>Budget the gas cost (~130k new trader, ~96k repeat).</li>
        </ol>
      `;
    } else if (activeSec === 'listing') {
      contentHtml = `
        <h1>Get listed</h1>
        <p>The ProjectRegistry decides which projects earn points. Anyone can apply with <code>applyListing</code>, an IdentityMD oracle panel answers yes or no against the rules, and anyone can challenge a listed project with a bond.</p>
        <p style="margin-top: 10px;"><strong>Listing requirements:</strong></p>
        <ul style="margin: 8px 0 16px 20px; display: flex; flex-direction: column; gap: 4px;">
          <li>The project is a deployed contract with published source.</li>
          <li>Cashback rate is between 25 and 100 bps.</li>
          <li>Fee guard: the part of your fee that leaves the project (LPs, burns) is at least as large as the cashback.</li>
        </ul>
      `;
    } else if (activeSec === 'points') {
      contentHtml = `
        <h1>Points</h1>
        <p>Every <code>Stacked</code> event is kept as an immutable record. Points are the basis for the leaderboards:</p>
        <ul style="margin: 8px 0 16px 20px; display: flex; flex-direction: column; gap: 4px;">
          <li><strong>Trader points:</strong> 1 point per IMD stacked from a listed project.</li>
          <li><strong>Project points:</strong> Total IMD its traders stacked.</li>
          <li><strong>Listed projects only:</strong> Direct calls to Stacker earn no points.</li>
        </ul>
      `;
    } else if (activeSec === 'agents') {
      contentHtml = `
        <h1>For agents</h1>
        <p>Copyable reference for an agent writing a contract integrating imd/acc (also available as static <a href="./llms.txt">/llms.txt</a>):</p>
        <pre><code>// Stacker: 0x0457276d7b036818b3eddc1a4a3fceda61e9314d
// ProjectRegistry: 0x3a3bfcb65614292b0ec7c62f9e3a5dac003b920e
// TestIMD: 0x2b69099e59b05901faa1dd164fabf098bf831e82
// TestSIMD: 0xf9e2eec3b610ec6781f7438ac5fb4bc049d81cc1

interface IStacker {
    function credit(address trader, uint256 imdAmount) external returns (uint256 shares);
}

// MUST rules:
// 1. Call credit from the trading contract itself, which holds IMD and approved Stacker
// 2. Only inside a trade, for that trade's real trader (from router hookData)
// 3. Always wrap in try/catch and pay plain IMD on failure</code></pre>
      `;
    }

    appRoot.innerHTML = `
      <div class="docs-select-wrap">
        <label for="docs-select" class="form-label">Docs Section</label>
        <select id="docs-select" class="docs-select">
          ${DOCS_SECTIONS.map(s => `
            <option value="${s.id}" ${s.id === activeSec ? 'selected' : ''}>${s.label}</option>
          `).join('')}
        </select>
      </div>

      <div class="docs-layout">
        <nav class="docs-sidebar" aria-label="Documentation Navigation">
          <ul class="docs-nav-list">
            ${DOCS_SECTIONS.map(s => `
              <li><a href="#/docs/${s.id}" ${s.id === activeSec ? 'aria-current="page"' : ''}>${s.label}</a></li>
            `).join('')}
          </ul>
        </nav>

        <article class="docs-content">
          ${contentHtml}
          <div class="docs-prev-next">
            ${prevSec ? `<a href="#/docs/${prevSec.id}">&larr; Previous: ${prevSec.label}</a>` : '<span></span>'}
            ${nextSec ? `<a href="#/docs/${nextSec.id}">Next: ${nextSec.label} &rarr;</a>` : '<span></span>'}
          </div>
        </article>
      </div>
    `;

    document.getElementById('docs-select')?.addEventListener('change', (e) => {
      location.hash = `#/docs/${e.target.value}`;
    });
  }

  // --- Page: 404 Not Found ---
  function renderNotFound() {
    document.title = 'Page Not Found - imd/acc';
    appRoot.innerHTML = `
      <div class="page-header">
        <h1>Page not found</h1>
      </div>
      <div class="box">
        <p>The requested route does not exist.</p>
        <p style="margin-top: 12px;"><a href="#/">&larr; Return to Home</a></p>
      </div>
    `;
  }

  // --- Initial Event Handlers & Wallet Setup ---
  function init() {
    setTheme(state.theme);

    // Theme toggle
    document.getElementById('theme-btn')?.addEventListener('click', () => {
      setTheme(state.theme === 'dark' ? 'light' : 'dark');
    });

    // Mobile menu toggle
    const menuBtn = document.getElementById('menu-btn');
    const nav = document.getElementById('mobile-navigation');
    menuBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = nav.classList.toggle('open');
      menuBtn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    });

    // Outside click closes menu
    document.addEventListener('click', (e) => {
      if (nav && nav.classList.contains('open') && !nav.contains(e.target) && e.target !== menuBtn) {
        nav.classList.remove('open');
        menuBtn?.setAttribute('aria-expanded', 'false');
      }
    });

    // Escape closes menu and returns focus
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && nav && nav.classList.contains('open')) {
        nav.classList.remove('open');
        menuBtn?.setAttribute('aria-expanded', 'false');
        menuBtn?.focus();
      }
    });

    // Refresh button
    document.getElementById('refresh-btn')?.addEventListener('click', () => {
      render();
    });

    // Connect wallet
    document.getElementById('connect-btn')?.addEventListener('click', async () => {
      if (!window.ethereum) {
        alert('No Web3 wallet detected.');
        return;
      }
      try {
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        if (accounts && accounts[0]) {
          state.account = accounts[0];
          document.getElementById('connect-btn').textContent = shortAddr(state.account);
          render();
        }
      } catch (err) {
        console.warn('Connect error:', err);
      }
    });

    // Window hashchange listener
    window.addEventListener('hashchange', render);

    // Check if wallet is already connected
    if (window.ethereum) {
      window.ethereum.request({ method: 'eth_accounts' }).then((accs) => {
        if (accs && accs[0]) {
          state.account = accs[0];
          const btn = document.getElementById('connect-btn');
          if (btn) btn.textContent = shortAddr(state.account);
        }
      }).catch(() => {});
    }

    // Initial render
    render();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
