// script.js
document.addEventListener('DOMContentLoaded', () => {
    const addressInput = document.getElementById('address');
    const requestBtn = document.getElementById('requestBtn');
    const messageDiv = document.getElementById('message');

    // ✅ Usa tu dominio real (¡NO rutas relativas en Netlify!)
    const API_BASE = 'https://nexa-faucet-backend-5nxc.onrender.com';

    // =============== BALANCE ===============
    async function updateBalance() {
        try {
            const response = await fetch(`${API_BASE}/balance`, { method: 'GET' });
            if (!response.ok) throw new Error('HTTP ' + response.status);

            const data = await response.json();
            if (data.success && typeof data.balanceInNEXA === 'number') {
                document.getElementById('balance')?.textContent = data.balanceInNEXA;
            } else {
                document.getElementById('balance')?.textContent = 'Error';
            }
        } catch (error) {
            console.warn('Balance update failed:', error);
            document.getElementById('balance')?.textContent = 'Offline';
        }
    }

    updateBalance();
    setInterval(updateBalance, 30000);

    // =============== UTILS ===============
    function showMessage(text, type) {
        if (!messageDiv) return;
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
    if (requestBtn) {
        requestBtn.addEventListener('click', async () => {
            const address = addressInput?.value.trim();

            if (!address) {
                showMessage('⚠️ Please enter a valid Nexa address.', 'error');
                return;
            }

            if (!isValidNexaAddress(address)) {
                showMessage('⚠️ Invalid Nexa Address. Must start with "nexa:" and be at least 48 characters.', 'error');
                return;
            }

            requestBtn.disabled = true;
            requestBtn.textContent = 'Sending...';

            try {
                const response = await fetch(`${API_BASE}/faucet`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ address }),
                });

                const data = await response.json().catch(() => ({}));
                if (!response.ok || !data.success) {
                    throw new Error(data.error || 'Unknown error');
                }

                const amount = data.amount ? (data.amount / 100000000).toFixed(4) : '0.0000';
                const shortTxid = data.txid ? data.txid.substring(0, 12) + '...' : 'N/A';

                showMessage(`✅ Sent ${amount} NEXA! TX: ${shortTxid}`, 'success');

            } catch (error) {
                console.error('Faucet error:', error);
                showMessage('❌ ' + (error.message || 'Request failed'), 'error');
            } finally {
                requestBtn.disabled = false;
                requestBtn.textContent = 'Solicitar 0.01 NEXA';
            }
        });
    }

    // =============== DONATION ADDRESS ===============
    async function loadDonationAddress() {
        const donationElement = document.getElementById('donationAddress');
        if (!donationElement) return;

        donationElement.textContent = 'Charging...';

        try {
            const response = await fetch(`${API_BASE}/balance`);
            if (!response.ok) throw new Error('Could not connect to server');

            const data = await response.json();
            if (data.success && data.address) {
                donationElement.textContent = data.address;
            } else {
                donationElement.textContent = 'No disponible';
            }
        } catch (error) {
            console.error('Error cargando dirección de donación:', error);
            donationElement.textContent = 'Upload failed, please try again later.';
        }
    }

    // Copiar al portapapeles (con soporte para iOS)
    const copyBtn = document.getElementById('copyBtn');
    if (copyBtn) {
        copyBtn.addEventListener('click', async () => {
            const donationElement = document.getElementById('donationAddress');
            if (!donationElement) {
                alert('Address not found.');
                return;
            }

            const address = donationElement.textContent.trim();
            if (!address || address.includes('Charging') || address.includes('failed')) {
                alert('Address not ready. Please wait.');
                return;
            }

            try {
                await navigator.clipboard.writeText(address);
                copyBtn.textContent = '¡Copied!';
                setTimeout(() => {
                    copyBtn.textContent = '📋 Copy';
                }, 2000);
            } catch (err) {
                const textArea = document.createElement('textarea');
                textArea.value = address;
                textArea.style.position = 'fixed';
                textArea.style.opacity = '0';
                document.body.appendChild(textArea);
                textArea.select();
                try {
                    const success = document.execCommand('copy');
                    if (success) {
                        copyBtn.textContent = '¡Copied!';
                        setTimeout(() => copyBtn.textContent = '📋 Copy', 2000);
                    } else {
                        alert('Copy failed. Please copy manually.');
                    }
                } catch (e) {
                    alert('Copy not supported. Please copy manually.');
                }
                document.body.removeChild(textArea);
            }
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
                grid.innerHTML = '<p style="text-align:center;color:#aaa">No recent transactions</p>';
            }
        } catch (error) {
            console.error('Error loading transactions:', error);
            const grid = document.getElementById('transactionsGrid');
            if (grid) {
                grid.innerHTML = '<p style="text-align:center;color:#ff6b6b">Failed to load transactions</p>';
            }
        }
    }

    // =============== INICIALIZAR ===============
    loadDonationAddress();
    loadTransactions();
    setInterval(loadTransactions, 30000);
});