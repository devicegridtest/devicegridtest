import { Address, HDPrivateKey } from 'https://cdn.jsdelivr.net/npm/libnexa-ts@latest/dist/index.esm.js';
import * as Bip39 from 'https://cdn.jsdelivr.net/npm/bip39@3.0.5/index.js';

document.addEventListener('DOMContentLoaded', () => {
    const addressInput = document.getElementById('address');
    const requestBtn = document.getElementById('requestBtn');
    const messageDiv = document.getElementById('message');

    const API_BASE = 'https://nexa-faucet-backend-5nxc.onrender.com';

    // =============== BALANCE ===============
    async function updateBalance() {
        try {
            const response = await fetch(`${API_BASE}/balance`);
            if (!response.ok) throw new Error('HTTP ' + response.status);
            const data = await response.json();
            if (data.success && data.balanceInNEXA !== undefined) {
                document.getElementById('balance').textContent = data.balanceInNEXA;
            } else {
                document.getElementById('balance').textContent = 'Error';
            }
        } catch (error) {
            console.error('Error actualizando saldo:', error);
            document.getElementById('balance').textContent = 'Offline';
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
            showMessage('⚠️ Dirección Nexa inválida. Debe empezar con "nexa:" y tener al menos 48 caracteres.', 'error');
            return;
        }

        requestBtn.disabled = true;
        requestBtn.textContent = 'Enviando...';

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

        donationElement.textContent = 'Cargando...';

        try {
            const response = await fetch(`${API_BASE}/balance`);
            if (!response.ok) throw new Error('No se pudo conectar al servidor');

            const data = await response.json();
            if (data.success && data.address) {
                donationElement.textContent = data.address;
            } else {
                donationElement.textContent = 'No disponible';
            }
        } catch (error) {
            console.error('Error cargando dirección de donación:', error);
            donationElement.textContent = 'Carga fallida. Inténtalo más tarde.';
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

            const address = donationElement.textContent.trim();
            if (!address || address.includes('Cargando') || address.includes('fallida')) {
                alert('La dirección aún no está disponible. Por favor, espera.');
                return;
            }

            navigator.clipboard.writeText(address).then(() => {
                copyBtn.textContent = '¡Copiado!';
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
        try {
            const response = await fetch(`${API_BASE}/transactions`);
            if (!response.ok) throw new Error('HTTP ' + response.status);

            const data = await response.json();
            const grid = document.getElementById('transactionsGrid');
            if (!grid) return;

            grid.innerHTML = '';

            if (data.success && Array.isArray(data.transactions) && data.transactions.length > 0) {
                data.transactions.forEach(tx => {
                    const card = document.createElement('div');
                    card.className = 'transaction-card';
                    card.innerHTML = `
                        <h3>🔑 Dirección</h3>
                        <div class="address">${tx.shortAddress || 'N/A'}</div>
                        <div class="date">🕒 ${tx.date || 'N/A'}</div>
                    `;
                    grid.appendChild(card);
                });
            } else {
                grid.innerHTML = '<p style="text-align:center;color:#aaa">No hay transacciones recientes</p>';
            }
        } catch (error) {
            console.error('Error cargando transacciones:', error);
            const grid = document.getElementById('transactionsGrid');
            if (grid) {
                grid.innerHTML = '<p style="text-align:center;color:#ff6b6b">Error al cargar transacciones</p>';
            }
        }
    }

    // ==================== ADMIN PANEL ====================
    document.addEventListener('DOMContentLoaded', () => {
        const adminPanel = document.getElementById('adminPanel');
        const openAdminBtn = document.getElementById('openAdminBtn');
        const closeAdminBtn = document.getElementById('closeAdmin');
        const loginAdminBtn = document.getElementById('loginAdmin');
        const adminPasswordInput = document.getElementById('adminPassword');

        const ADMIN_PASSWORD = 'NexaFaucet2025!'; // ✅ CAMBIA ESTO

        openAdminBtn.addEventListener('click', () => {
            adminPanel.style.display = 'block';
            adminPasswordInput.focus();
        });

        closeAdminBtn.addEventListener('click', () => {
            adminPanel.style.display = 'none';
        });

        loginAdminBtn.addEventListener('click', async () => {
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

                const transactionsRes = await fetch(`${API_BASE}/transactions`);
                const transactionsData = await transactionsRes.json();
                const adminTransactionsDiv = document.getElementById('adminTransactions');

                if (transactionsData.success && transactionsData.transactions.length > 0) {
                    adminTransactionsDiv.innerHTML = transactionsData.transactions
                        .map(tx => `
                            <div style="padding: 8px; border-bottom: 1px solid #333; font-size: 0.9rem;">
                                <strong>${tx.shortAddress}</strong><br>
                                <small>${tx.date}</small>
                            </div>
                        `)
                        .join('');
                } else {
                    adminTransactionsDiv.innerHTML = '<p>No hay transacciones recientes.</p>';
                }

            } catch (error) {
                document.getElementById('adminTransactions').innerHTML = `<p style="color: #ff6b6b;">Error cargando datos: ${error.message}</p>`;
            }
        }

        document.getElementById('reloadFaucet').addEventListener('click', async () => {
            if (!adminPanel.classList.contains('authenticated')) return;
            if (!confirm('¿Estás seguro? Esto enviará 1 NEXA a la billetera de la faucet.')) return;

            const response = await fetch(`${API_BASE}/reload`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ amount: 100000000 })
            });

            const data = await response.json();
            if (data.success) {
                alert('✅ Fondos enviados a la faucet.');
                loadAdminData();
            } else {
                alert('❌ Error: ' + data.error);
            }
        });

        document.getElementById('clearCooldown').addEventListener('click', async () => {
            if (!adminPanel.classList.contains('authenticated')) return;
            if (!confirm('¿Estás seguro? Esto borrará todos los cooldowns. Solo para pruebas.')) return;

            const response = await fetch(`${API_BASE}/clear-cooldown`, {
                method: 'POST'
            });

            const data = await response.json();
            if (data.success) {
                alert('✅ Todos los cooldowns han sido limpiados.');
                loadAdminData();
            } else {
                alert('❌ Error: ' + data.error);
            }
        });

        if (localStorage.getItem('adminAuthenticated') === 'true') {
            adminPanel.classList.add('authenticated');
            adminPasswordInput.disabled = true;
            loginAdminBtn.disabled = true;
            adminPasswordInput.placeholder = "✅ Autenticado";
            loadAdminData();
        }

        document.addEventListener('click', (e) => {
            if (e.target.id === 'closeAdmin') {
                localStorage.setItem('adminAuthenticated', adminPanel.classList.contains('authenticated') ? 'true' : 'false');
            }
        });
    });

    // Inicializar
    loadDonationAddress();
    loadTransactions();
    setInterval(loadTransactions, 30000);
});