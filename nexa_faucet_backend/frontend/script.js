document.addEventListener('DOMContentLoaded', () => {
    const addressInput = document.getElementById('address');
    const requestBtn = document.getElementById('requestBtn');
    const messageDiv = document.getElementById('message');

    // ✅ URL corregida — sin espacios ni errores
    const API_BASE = 'https://nexa-faucet.onrender.com';

    // =============== FUNCIONES DE CARGA CON ANIMACIÓN ===============
    
    // Función para mostrar un spinner
    function showLoader(element, text = 'Cargando...') {
        element.innerHTML = `
            <div class="loader"></div>
            ${text}
        `;
    }

    // Función para limpiar el loader
    function clearLoader(element, html) {
        if (element instanceof HTMLElement) {
            element.innerHTML = html;
        }
    }

    // =============== BALANCE ===============
    async function updateBalance() {
        const balanceElement = document.getElementById('balance');
        if (!balanceElement) return;

        try {
            showLoader(balanceElement); // 🌀 Mostrar animación

            const response = await fetch(`${API_BASE}/balance`);
            if (!response.ok) throw new Error('HTTP ' + response.status);

            const data = await response.json();
            if (data.success && data.balanceInNEXA !== undefined) {
                clearLoader(balanceElement, `<strong>${data.balanceInNEXA}</strong> NEXA`);
            } else {
                clearLoader(balanceElement, 'Error');
            }
        } catch (error) {
            console.error('Error actualizando saldo:', error);
            clearLoader(document.getElementById('balance'), 'Offline');
        }
    }

    updateBalance();
    setInterval(updateBalance, 30000);

    // =============== UTILS ===============
    function showMessage(text, type) {
        messageDiv.textContent = text;
        messageDiv.className = 'message ' + type;
        messageDiv.style.display = 'block';
        setTimeout(() => {
            messageDiv.style.display = 'none';
        }, 8000);
    }

    function isValidNexaAddress(address) {
        const regex = /^nexa:[a-z0-9]{48,}$/;
        return regex.test(address);
    }

    // =============== FAUCET REQUEST ===============
    requestBtn.addEventListener('click', async () => {
        const address = addressInput.value.trim();

        if (!address) {
            showMessage('⚠️ Por favor ingresa una dirección.', 'error');
            return;
        }

        if (!isValidNexaAddress(address)) {
            showMessage('⚠️ Dirección Nexa inválida. Debe empezar con "nexa:"', 'error');
            return;
        }

        requestBtn.disabled = true;
        requestBtn.innerHTML = '<div class="loader small"></div> Enviando...';

        try {
            const response = await fetch(`${API_BASE}/faucet`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ address }),
            });

            const data = await response.json().catch(() => ({}));
            if (!response.ok || !data.success) {
                throw new Error(data.error || 'Error desconocido');
            }

            const amount = data.amount ? (data.amount / 100000000).toFixed(4) : '0.0000';
            const shortTxid = data.txid ? data.txid.substring(0, 12) + '...' : 'N/A';

            showMessage(`✅ ¡Enviados ${amount} NEXA! TX: ${shortTxid}`, 'success');

        } catch (error) {
            console.error(error);
            showMessage('❌ ' + error.message, 'error');
        } finally {
            requestBtn.disabled = false;
            requestBtn.textContent = 'Solicitar 0.01 NEXA';
        }
    });

    // =============== DONATION ADDRESS ===============
    async function loadDonationAddress() {
        const donationElement = document.getElementById('donationAddress');
        if (!donationElement) return;

        showLoader(donationElement, ''); // Solo spinner mientras carga

        try {
            const response = await fetch(`${API_BASE}/balance`);
            if (!response.ok) throw new Error('No se pudo conectar al servidor');

            const data = await response.json();
            if (data.success && data.address) {
                clearLoader(donationElement, `<code>${data.address}</code>`);
            } else {
                clearLoader(donationElement, 'No disponible');
            }
        } catch (error) {
            console.error('Error cargando dirección de donación:', error);
            clearLoader(donationElement, 'Carga fallida. Inténtalo más tarde.');
        }
    }

    // Copiar al portapapeles
    const copyBtn = document.getElementById('copyBtn');
    if (copyBtn) {
        copyBtn.addEventListener('click', () => {
            const donationElement = document.getElementById('donationAddress');
            if (!donationElement) {
                alert('Elemento de dirección no encontrado.');
                return;
            }

            const code = donationElement.querySelector('code') || donationElement;
            const address = code?.textContent.trim() || '';

            if (!address || address === 'No disponible') {
                alert('La dirección aún no está disponible. Por favor, espera.');
                return;
            }

            navigator.clipboard.writeText(address).then(() => {
                copyBtn.textContent = '✅ Copiado!';
                setTimeout(() => {
                    copyBtn.textContent = '📋 Copiar';
                }, 2000);
            }).catch(err => {
                console.error('Error al copiar:', err);
                alert('No se pudo copiar. Intenta manualmente.');
            });
        });
    }

    // =============== LIVE TRANSACTIONS ===============
    async function loadTransactions() {
        const grid = document.getElementById('transactionsGrid');
        if (!grid) return;

        // Muestra skeletons mientras carga
        grid.innerHTML = `
            <div class="skeleton-card"><div class="skeleton-line"></div><div class="skeleton-line"></div></div>
            <div class="skeleton-card"><div class="skeleton-line"></div><div class="skeleton-line"></div></div>
            <div class="skeleton-card"><div class="skeleton-line"></div><div class="skeleton-line"></div></div>
        `;

        try {
            const response = await fetch(`${API_BASE}/transactions`);
            if (!response.ok) throw new Error('HTTP ' + response.status);

            const data = await response.json();
            const container = document.getElementById('transactionsGrid');
            if (!container) return;

            container.innerHTML = '';

            if (data.success && Array.isArray(data.transactions) && data.transactions.length > 0) {
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
        } catch (error) {
            console.error('Error cargando transacciones:', error);
            const grid = document.getElementById('transactionsGrid');
            if (grid) {
                grid.innerHTML = '<p style="text-align:center;color:#ff6b6b">Error al cargar transacciones</p>';
            }
        }
    }

    // =============== PANEL DE ADMINISTRACIÓN ===============
    const adminPanel = document.getElementById('adminPanel');
    const openAdminBtn = document.getElementById('openAdminBtn');
    const closeAdminBtn = document.getElementById('closeAdmin');
    const loginAdminBtn = document.getElementById('loginAdmin');
    const adminPasswordInput = document.getElementById('adminPassword');

    // 🔐 CONTRASEÑA SEGURA (cámbiala)
    const ADMIN_PASSWORD = 'NexaFaucet2025!';

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
            const balanceRes = await fetch(`${API_BASE}/balance`);
            const balanceData = await balanceRes.json();

            if (balanceData.success) {
                document.getElementById('adminAddress').textContent = balanceData.address;
                document.getElementById('adminBalance').textContent = balanceData.balanceInNEXA;
            }

            const txRes = await fetch(`${API_BASE}/transactions`);
            const txData = await txRes.json();
            const adminTxDiv = document.getElementById('adminTransactions');
            
            if (txData.success && txData.transactions.length > 0) {
                adminTxDiv.innerHTML = txData.transactions.map(tx => `
                    <div style="padding: 8px; border-bottom: 1px solid #333; font-size: 0.9rem;">
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

    // Acción: Limpiar cooldowns
    document.getElementById('clearCooldown')?.addEventListener('click', async () => {
        if (!adminPanel.classList.contains('authenticated')) return;
        if (!confirm('¿Limpiar todos los registros?')) return;

        const res = await fetch(`${API_BASE}/clear-cooldown`, {
            method: 'POST'
        });
        const data = await res.json();
        if (data.success) {
            alert('✅ Cooldowns limpiados');
            loadAdminData();
        } else {
            alert('❌ Error: ' + data.error);
        }
    });

    // Inicializar
    loadDonationAddress();
    loadTransactions();
    setInterval(loadTransactions, 30000);
});
