document.addEventListener('DOMContentLoaded', () => {
    const addressInput = document.getElementById('address');
    const requestBtn = document.getElementById('requestBtn');
    const messageDiv = document.getElementById('message');

    // ✅ CORREGIDO: Eliminados los espacios en blanco al final
    const API_BASE = 'https://nexa-faucet.onrender.com';

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
            const response = await fetch(`${API_BASE}/balance`); // ✅ Usamos /balance, no /donation
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

    // Inicializar
    loadDonationAddress();
    loadTransactions();
    setInterval(loadTransactions, 30000);
});