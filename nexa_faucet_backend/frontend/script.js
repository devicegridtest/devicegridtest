document.addEventListener('DOMContentLoaded', () => {
    const addressInput = document.getElementById('address');
    const requestBtn = document.getElementById('requestBtn');
    const messageDiv = document.getElementById('message');

    // ✅ URL corregida — SIN ESPACIOS
    const API_BASE = 'https://nexa-faucet.onrender.com';

    // =============== FUNCIONES DE CARGA ===============
    function showLoader(element, text = 'Cargando...') {
        element.innerHTML = `<div class="loader"></div>${text}`;
    }

    function clearLoader(element, html) {
        if (element instanceof HTMLElement) element.innerHTML = html;
    }

    // =============== UTILS ===============
    function showMessage(text, type) {
        messageDiv.textContent = text;
        messageDiv.className = 'message ' + type;
        messageDiv.style.display = 'block';
        setTimeout(() => messageDiv.style.display = 'none', 8000);
    }

    function isValidNexaAddress(address) {
        const regex = /^nexa:[a-z0-9]{48,}$/;
        return regex.test(address);
    }

    // =============== BALANCE ===============
    async function updateBalance() {
        const balanceElement = document.getElementById('balance');
        if (!balanceElement) return;

        try {
            showLoader(balanceElement);
            const response = await fetch(`${API_BASE}/balance`);
            if (!response.ok) throw new Error('HTTP ' + response.status);
            const data = await response.json();
            if (data.success && data.balanceInNEXA !== undefined) {
                // ✅ Usa el valor tal cual (ya está en NEXA)
                clearLoader(balanceElement, `<strong>${data.balanceInNEXA}</strong> NEXA`);
            } else {
                clearLoader(balanceElement, 'Error');
            }
        } catch (error) {
            console.error('Error actualizando saldo:', error);
            clearLoader(balanceElement, 'Offline');
        }
    }

    updateBalance();
    setInterval(updateBalance, 30000);

    // =============== FAUCET ===============
    requestBtn.addEventListener('click', async () => {
        const address = addressInput.value.trim();
        if (!address) return showMessage('⚠️ Por favor ingresa una dirección.', 'error');
        if (!isValidNexaAddress(address)) return showMessage('⚠️ Dirección Nexa inválida. Debe empezar con "nexa:"', 'error');

        requestBtn.disabled = true;
        requestBtn.innerHTML = '<div class="loader small"></div> Enviando...';

        try {
            const response = await fetch(`${API_BASE}/faucet`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ address }),
            });

            const data = await response.json().catch(() => ({}));
            if (!response.ok || !data.success) throw new Error(data.error || 'Error desconocido');

            // ✅ El backend devuelve amount en satoshis → convertir a NEXA
            const amount = data.amount ? (data.amount / 100).toFixed(2) : '0.00';
            const shortTxid = data.txid ? data.txid.substring(0, 12) + '...' : 'N/A';
            showMessage(`✅ ¡Enviados ${amount} NEXA! TX: ${shortTxid}`, 'success');

        } catch (error) {
            console.error(error);
            showMessage('❌ ' + error.message, 'error');
        } finally {
            requestBtn.disabled = false;
            requestBtn.textContent = 'Solicitar 100 NEXA';
        }
    });

    // =============== DONATION & TRANSACTIONS ===============
    async function loadDonationAddress() {
        const el = document.getElementById('donationAddress');
        if (!el) return;
        showLoader(el, '');
        try {
            const res = await fetch(`${API_BASE}/balance`);
            const data = await res.json();
            clearLoader(el, data.success && data.address ? `<code>${data.address}</code>` : 'No disponible');
        } catch (err) {
            clearLoader(el, 'Carga fallida. Inténtalo más tarde.');
        }
    }

    const copyBtn = document.getElementById('copyBtn');
    copyBtn?.addEventListener('click', () => {
        const el = document.getElementById('donationAddress');
        const code = el?.querySelector('code');
        const addr = code?.textContent.trim();
        if (!addr || addr === 'No disponible') return alert('La dirección aún no está disponible.');
        navigator.clipboard.writeText(addr).then(() => {
            copyBtn.textContent = '✅ Copiado!';
            setTimeout(() => copyBtn.textContent = '📋 Copiar', 2000);
        }).catch(() => alert('No se pudo copiar.'));
    });

    async function loadTransactions() {
        const grid = document.getElementById('transactionsGrid');
        if (!grid) return;
        grid.innerHTML = `
            <div class="skeleton-card"><div class="skeleton-line"></div><div class="skeleton-line"></div></div>
            <div class="skeleton-card"><div class="skeleton-line"></div><div class="skeleton-line"></div></div>
            <div class="skeleton-card"><div class="skeleton-line"></div><div class="skeleton-line"></div></div>
        `;
        try {
            const res = await fetch(`${API_BASE}/transactions`);
            const data = await res.json();
            const container = document.getElementById('transactionsGrid');
            if (!container) return;
            container.innerHTML = '';
            if (data.success && data.transactions?.length) {
                data.transactions.forEach(tx => {
                    const card = document.createElement('div');
                    card.className = 'transaction-card';
                    card.innerHTML = `
                        <h3>🔑 Dirección</h3>
                        <div class="address">${tx.shortAddress || 'N/A'}</div>
                        <div class="date">🕒 ${tx.date || 'N/A'}</div>
                    `;
                    container.appendChild(card);
                });
            } else {
                container.innerHTML = '<p style="text-align:center;color:#aaa">No hay transacciones recientes</p>';
            }
        } catch (err) {
            console.error('Error cargando transacciones:', err);
            if (grid) grid.innerHTML = '<p style="text-align:center;color:#ff6b6b">Error al cargar transacciones</p>';
        }
    }

    // =============== PANEL DE ADMIN ===============
    const adminPanel = document.getElementById('adminPanel');
    const openAdminBtn = document.getElementById('openAdminBtn');
    const closeAdminBtn = document.getElementById('closeAdmin');
    const loginAdminBtn = document.getElementById('loginAdmin');
    const adminPasswordInput = document.getElementById('adminPassword');

    const ADMIN_PASSWORD = atob('TmV4YUZhdWNldDIwMjUh');

    openAdminBtn?.addEventListener('click', () => {
        adminPanel.style.display = 'block';
        adminPasswordInput.focus();
    });

    closeAdminBtn?.addEventListener('click', () => {
        adminPanel.style.display = 'none';
    });

    loginAdminBtn?.addEventListener('click', async () => {
        if (adminPasswordInput.value === ADMIN_PASSWORD) {
            adminPanel.classList.add('authenticated');
            adminPasswordInput.disabled = true;
            loginAdminBtn.disabled = true;
            adminPasswordInput.placeholder = "✅ Autenticado";
            await loadAdminData();
        } else {
            alert('❌ Contraseña incorrecta');
        }
    });

    async function loadAdminData() {
        try {
            const [balanceRes, txRes] = await Promise.all([
                fetch(`${API_BASE}/balance`),
                fetch(`${API_BASE}/transactions`)
            ]);
            const balanceData = await balanceRes.json();
            if (balanceData.success) {
                document.getElementById('adminAddress').textContent = balanceData.address;
                document.getElementById('adminBalance').textContent = balanceData.balanceInNEXA;
            }
            const txData = await txRes.json();
            const adminTxDiv = document.getElementById('adminTransactions');
            if (txData.success && txData.transactions?.length) {
                adminTxDiv.innerHTML = txData.transactions.map(tx => `
                    <div style="padding:8px;border-bottom:1px solid #333;font-size:0.9rem">
                        <strong>${tx.shortAddress}</strong><br>
                        <small>${tx.date}</small>
                    </div>
                `).join('');
            } else {
                adminTxDiv.innerHTML = '<p>No hay transacciones</p>';
            }
        } catch (err) {
            console.error('Error en admin:', err);
        }
    }

    document.getElementById('clearCooldown')?.addEventListener('click', async () => {
        if (!adminPanel.classList.contains('authenticated')) return;
        if (!confirm('¿Limpiar todos los registros?')) return;
        const res = await fetch(`${API_BASE}/clear-cooldown`, { method: 'POST' });
        const data = await res.json();
        alert(data.success ? '✅ Cooldowns limpiados' : '❌ Error: ' + data.error);
        if (data.success) loadAdminData();
    });

    // Inicializar
    loadDonationAddress();
    loadTransactions();
    setInterval(loadTransactions, 30000);
});
