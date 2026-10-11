/**
 * imd/acc - Web Application & Interactive Logic
 * Compatible with IPFS Gateways, GitHub Pages, and Local file://
 */

(() => {
  'use strict';

  // --- Constants & Contract Addresses ---
  const CONTRACTS = {
    SEPOLIA_CHAIN_ID: '0xaa36a7', // 11155111
    STACKER: '0x0457276d7b036818b3eddc1a4a3fceda61e9314d',
    PROJECT_REGISTRY: '0x3a3bfcb65614292b0ec7c62f9e3a5dac003b920e',
    TEST_IMD: '0x2b69099e59b05901faa1dd164fabf098bf831e82',
    TEST_SIMD: '0xf9e2eec3b610ec6781f7438ac5fb4bc049d81cc1',
    MAINNET_IMD: '0xd34a99bc0f67ae1bbd63c660e6d0b0dd03e263b7',
    MAINNET_SIMD: '0x9efa934d9fad4ae28c998a40195646b965a97247'
  };

  // --- State ---
  const state = {
    theme: localStorage.getItem('imd_acc_theme') || 'dark',
    userAccount: null,
    chainId: null,
    isSepolia: false,
    mockBalances: {
      cashback: 25.0,
      shares: 24.12,
      worth: 26.35,
      points: 25.0
    }
  };

  // --- DOM Elements ---
  const elements = {
    html: document.documentElement,
    themeToggle: document.getElementById('theme-toggle'),
    iconTheme: document.getElementById('icon-theme'),
    mobileToggle: document.getElementById('mobile-toggle'),
    navMenu: document.getElementById('nav-menu'),
    btnWallet: document.getElementById('btn-wallet'),
    walletLabel: document.getElementById('wallet-label'),
    appConnBadge: document.getElementById('app-conn-badge'),
    appConnText: document.getElementById('app-conn-text'),
    toast: document.getElementById('toast-msg'),
    toastText: document.getElementById('toast-text'),

    // Calculator inputs & outputs
    tradeSlider: document.getElementById('trade-size-slider'),
    tradeValText: document.getElementById('trade-val-text'),
    rateSlider: document.getElementById('rate-slider'),
    rateValText: document.getElementById('rate-val-text'),
    durationSlider: document.getElementById('duration-slider'),
    durationValText: document.getElementById('duration-val-text'),
    cashbackOutput: document.getElementById('cashback-output'),
    simdSharesOutput: document.getElementById('simd-shares-output'),
    futureValueOutput: document.getElementById('future-value-output'),
    yieldEarnedOutput: document.getElementById('yield-earned-output'),
    pointsOutput: document.getElementById('points-output'),
    tenTradesOutput: document.getElementById('ten-trades-output'),

    // App stats
    statCashback: document.getElementById('stat-cashback'),
    statShares: document.getElementById('stat-shares'),
    statWorth: document.getElementById('stat-worth'),
    statPoints: document.getElementById('stat-points'),
    btnFaucet: document.getElementById('btn-faucet'),
    btnSelfStack: document.getElementById('btn-self-stack'),
    selfStackAmt: document.getElementById('self-stack-amt'),
    eventsTableBody: document.getElementById('events-table-body')
  };

  // --- Toast Helper ---
  let toastTimer = null;
  function showToast(message, isSuccess = true) {
    if (!elements.toast) return;
    if (elements.toastText) elements.toastText.textContent = message;
    elements.toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      elements.toast.classList.remove('show');
    }, 2800);
  }

  // --- Theme Toggle ---
  function applyTheme(theme) {
    state.theme = theme;
    elements.html.setAttribute('data-theme', theme);
    localStorage.setItem('imd_acc_theme', theme);

    if (elements.iconTheme) {
      if (theme === 'light') {
        // Sun icon
        elements.iconTheme.innerHTML = `
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
        // Moon icon
        elements.iconTheme.innerHTML = `<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>`;
      }
    }
  }

  function initTheme() {
    applyTheme(state.theme);
    if (elements.themeToggle) {
      elements.themeToggle.addEventListener('click', () => {
        applyTheme(state.theme === 'dark' ? 'light' : 'dark');
      });
    }
  }

  // --- Navigation & Routing ---
  function updateActiveNav(hash) {
    const cleanHash = hash.replace(/^#\/?/, '').toLowerCase() || 'home';
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
      const route = link.getAttribute('data-route');
      if (route === cleanHash || (cleanHash === '' && route === 'home')) {
        link.classList.add('active');
      } else {
        link.classList.remove('active');
      }
    });

    // Close mobile menu if open
    if (elements.navMenu) elements.navMenu.classList.remove('open');
  }

  function initRouting() {
    window.addEventListener('hashchange', () => {
      updateActiveNav(window.location.hash);
    });

    updateActiveNav(window.location.hash);

    if (elements.mobileToggle && elements.navMenu) {
      elements.mobileToggle.addEventListener('click', () => {
        elements.navMenu.classList.toggle('open');
      });
    }
  }

  // --- Interactive Calculator ---
  function formatNumber(num, maxDecimals = 2) {
    return num.toLocaleString('en-US', {
      minimumFractionDigits: maxDecimals > 0 ? 2 : 0,
      maximumFractionDigits: maxDecimals
    });
  }

  function updateCalculator() {
    if (!elements.tradeSlider || !elements.rateSlider || !elements.durationSlider) return;

    const tradeSize = parseFloat(elements.tradeSlider.value) || 1000;
    const rateBps = parseFloat(elements.rateSlider.value) || 0.5; // percentage
    const durationMonths = parseInt(elements.durationSlider.value, 10) || 6;

    // Update Input Display Badges
    if (elements.tradeValText) elements.tradeValText.textContent = `${formatNumber(tradeSize, 0)} IMD`;
    if (elements.rateValText) elements.rateValText.textContent = `${rateBps.toFixed(2)}% (${Math.round(rateBps * 100)} bps)`;
    if (elements.durationValText) elements.durationValText.textContent = `${durationMonths} Month${durationMonths > 1 ? 's' : ''}`;

    // Mathematics
    const cashbackImd = tradeSize * (rateBps / 100);
    // Vault share valuation: 1 sIMD has accrued some yield, e.g., 1.037 IMD per sIMD
    const vaultShareRate = 1.037;
    const sharesMinted = cashbackImd / vaultShareRate;

    // Compounded yield: assuming ~12% annualized vault APY
    const monthlyRate = 0.12 / 12;
    const futureValue = cashbackImd * Math.pow(1 + monthlyRate, durationMonths);
    const yieldEarned = futureValue - cashbackImd;
    const pointsAccrued = cashbackImd; // 1 point per IMD
    const tenTrades = cashbackImd * 10;

    // Update Output Displays
    if (elements.cashbackOutput) elements.cashbackOutput.textContent = `${formatNumber(cashbackImd)} IMD`;
    if (elements.simdSharesOutput) elements.simdSharesOutput.textContent = `~${formatNumber(sharesMinted)} sIMD`;
    if (elements.futureValueOutput) elements.futureValueOutput.textContent = `${formatNumber(futureValue)} IMD`;
    if (elements.yieldEarnedOutput) elements.yieldEarnedOutput.textContent = `+${formatNumber(yieldEarned)} IMD`;
    if (elements.pointsOutput) elements.pointsOutput.textContent = `${formatNumber(pointsAccrued, 1)} Points`;
    if (elements.tenTradesOutput) elements.tenTradesOutput.textContent = `${formatNumber(tenTrades)} IMD`;
  }

  function initCalculator() {
    if (elements.tradeSlider) elements.tradeSlider.addEventListener('input', updateCalculator);
    if (elements.rateSlider) elements.rateSlider.addEventListener('input', updateCalculator);
    if (elements.durationSlider) elements.durationSlider.addEventListener('input', updateCalculator);

    // Preset chips
    document.querySelectorAll('[data-trade]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('[data-trade]').forEach(b => b.classList.remove('active'));
        e.currentTarget.classList.add('active');
        if (elements.tradeSlider) {
          elements.tradeSlider.value = e.currentTarget.getAttribute('data-trade');
          updateCalculator();
        }
      });
    });

    document.querySelectorAll('[data-rate]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('[data-rate]').forEach(b => b.classList.remove('active'));
        e.currentTarget.classList.add('active');
        if (elements.rateSlider) {
          elements.rateSlider.value = e.currentTarget.getAttribute('data-rate');
          updateCalculator();
        }
      });
    });

    updateCalculator();
  }

  // --- Web3 & Sepolia Integration with Simulation Fallback ---
  function updateWalletUI() {
    if (state.userAccount) {
      const shortAddr = `${state.userAccount.slice(0, 6)}...${state.userAccount.slice(-4)}`;
      if (elements.walletLabel) elements.walletLabel.textContent = shortAddr;
      if (elements.btnWallet) {
        elements.btnWallet.classList.remove('btn-secondary');
        elements.btnWallet.classList.add('btn-primary');
      }

      if (elements.appConnBadge) {
        elements.appConnBadge.className = 'badge-status connected';
        if (elements.appConnText) {
          elements.appConnText.textContent = state.isSepolia
            ? `Connected: ${shortAddr} (Sepolia)`
            : `Connected: ${shortAddr} (Switch to Sepolia)`;
        }
      }
    } else {
      if (elements.walletLabel) elements.walletLabel.textContent = 'Connect Wallet';
      if (elements.btnWallet) {
        elements.btnWallet.classList.add('btn-secondary');
        elements.btnWallet.classList.remove('btn-primary');
      }

      if (elements.appConnBadge) {
        elements.appConnBadge.className = 'badge-status disconnected';
        if (elements.appConnText) {
          elements.appConnText.textContent = 'Demo Mode (Connect Wallet for live on-chain reads)';
        }
      }
    }
  }

  async function connectWallet() {
    if (typeof window.ethereum === 'undefined') {
      showToast('No Web3 wallet found. Exploring in Demo Mode!');
      return;
    }

    try {
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      if (accounts && accounts.length > 0) {
        state.userAccount = accounts[0];
        const chainId = await window.ethereum.request({ method: 'eth_chainId' });
        state.chainId = chainId;
        state.isSepolia = (chainId === CONTRACTS.SEPOLIA_CHAIN_ID || chainId === '0xaa36a7');

        if (!state.isSepolia) {
          try {
            await window.ethereum.request({
              method: 'wallet_switchEthereumChain',
              params: [{ chainId: CONTRACTS.SEPOLIA_CHAIN_ID }]
            });
            state.isSepolia = true;
          } catch (switchErr) {
            console.warn('Could not switch to Sepolia automatically', switchErr);
          }
        }

        updateWalletUI();
        showToast(`Connected: ${state.userAccount.slice(0, 6)}...${state.userAccount.slice(-4)}`);
      }
    } catch (err) {
      console.error('Wallet connection error:', err);
      showToast(err.message || 'Failed to connect wallet', false);
    }
  }

  function initWallet() {
    if (elements.btnWallet) {
      elements.btnWallet.addEventListener('click', connectWallet);
    }

    if (typeof window.ethereum !== 'undefined') {
      window.ethereum.on('accountsChanged', (accounts) => {
        if (accounts.length > 0) {
          state.userAccount = accounts[0];
        } else {
          state.userAccount = null;
        }
        updateWalletUI();
      });

      window.ethereum.on('chainChanged', (chainId) => {
        state.chainId = chainId;
        state.isSepolia = (chainId === CONTRACTS.SEPOLIA_CHAIN_ID);
        updateWalletUI();
      });
    }

    // Faucet Button
    if (elements.btnFaucet) {
      elements.btnFaucet.addEventListener('click', async () => {
        if (!state.userAccount || !window.ethereum) {
          // Demo simulation
          showToast('Demo Faucet: +10,000 tIMD simulated to your balance!');
          return;
        }

        try {
          showToast('Submitting faucet transaction to TestIMD...');
          // faucet() selector is 0x56ee3663
          const txHash = await window.ethereum.request({
            method: 'eth_sendTransaction',
            params: [{
              from: state.userAccount,
              to: CONTRACTS.TEST_IMD,
              data: '0x56ee3663'
            }]
          });
          showToast(`Faucet tx sent: ${txHash.slice(0, 10)}...`);
        } catch (err) {
          showToast(err.message || 'Faucet call rejected', false);
        }
      });
    }

    // Self Stack Button
    if (elements.btnSelfStack) {
      elements.btnSelfStack.addEventListener('click', () => {
        const amt = parseFloat(elements.selfStackAmt.value) || 50;
        state.mockBalances.cashback += amt;
        state.mockBalances.shares += (amt / 1.037);
        state.mockBalances.worth += amt * 1.04;
        state.mockBalances.points += amt;

        if (elements.statCashback) elements.statCashback.textContent = `${formatNumber(state.mockBalances.cashback)} IMD`;
        if (elements.statShares) elements.statShares.textContent = `${formatNumber(state.mockBalances.shares)} sIMD`;
        if (elements.statWorth) elements.statWorth.textContent = `${formatNumber(state.mockBalances.worth)} IMD`;
        if (elements.statPoints) elements.statPoints.textContent = `${formatNumber(state.mockBalances.points)} PTS`;

        // Prepend event row
        if (elements.eventsTableBody) {
          const newRow = document.createElement('tr');
          newRow.innerHTML = `
            <td><strong class="mono">SelfCredit</strong> (Direct)</td>
            <td class="mono">${formatNumber(amt)} IMD</td>
            <td class="mono">${formatNumber(amt / 1.037)} sIMD</td>
            <td class="mono">0.00</td>
            <td><span class="pill pill-test">Direct</span></td>
          `;
          elements.eventsTableBody.insertBefore(newRow, elements.eventsTableBody.firstChild);
        }

        showToast(`Stacked ${amt} IMD into sIMD vault!`);
      });
    }

    updateWalletUI();
  }

  // --- Project Filter Tabs ---
  function initProjectFilters() {
    const tabs = document.querySelectorAll('.filter-tab');
    const rows = document.querySelectorAll('.projects-table-wrap tbody tr');

    tabs.forEach(tab => {
      tab.addEventListener('click', (e) => {
        tabs.forEach(t => t.classList.remove('active'));
        e.currentTarget.classList.add('active');
        const filter = e.currentTarget.getAttribute('data-filter');

        rows.forEach(row => {
          if (filter === 'all') {
            row.style.display = '';
          } else if (filter === 'live') {
            row.style.display = row.innerText.includes('Live Integration') ? '' : 'none';
          } else if (filter === 'planned') {
            row.style.display = row.innerText.includes('Planned') ? '' : 'none';
          }
        });
      });
    });
  }

  // --- Clipboard Copy Helper ---
  function initClipboard() {
    document.querySelectorAll('.copy-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const textToCopy = e.currentTarget.getAttribute('data-clipboard') ||
          (e.currentTarget.getAttribute('data-clipboard-target') &&
           document.querySelector(e.currentTarget.getAttribute('data-clipboard-target'))?.innerText);

        if (textToCopy) {
          navigator.clipboard.writeText(textToCopy.trim()).then(() => {
            showToast('Copied to clipboard!');
          }).catch(err => {
            console.error('Clipboard error:', err);
            showToast('Copy failed', false);
          });
        }
      });
    });
  }

  // --- Initialize All ---
  document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    initRouting();
    initCalculator();
    initWallet();
    initProjectFilters();
    initClipboard();
  });

})();
