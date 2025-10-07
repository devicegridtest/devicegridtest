document.addEventListener('DOMContentLoaded', () => {
    const addressInput = document.getElementById('address');
    const requestBtn = document.getElementById('requestBtn');
    const messageDiv = document.getElementById('message');


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
            console.error('Error updating balance:', error);
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
            showMessage('⚠️ Please enter a valid email address.', 'error');
            return;
        }

        if (!isValidNexaAddress(address)) {
            showMessage('⚠️ Invalid Nexa address. Must start with"nexa:"and be at least 48 characters.', 'error');
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

            const amount = data.amount ? (data.amount / 100).toFixed(4) : '0.0000';
            const shortTxid = data.txid ? data.txid.substring(0, 12) + '...' : 'N/A';

               // ✅ Obtener fecha y hora exacta de la transacción
               const now = new Date();
               const formattedDate = now.toLocaleString('en-EN', {
                 dateStyle: 'medium',
                 timeStyle: 'medium'
        });


            showMessage(`✅ Sent ${amount} NEXA! TX: ${shortTxid} 🕒 ${formattedDate}`, 'success');

        } catch (error) {
            console.error(error);
            showMessage('❌ ' + error.message, 'error');
        } finally {
            requestBtn.disabled = false;
            requestBtn.textContent = 'Request 100 NEXA';
        }
    });

    // =============== DONATION ADDRESS ===============
    async function loadDonationAddress() {
        const donationElement = document.getElementById('donationAddress');
        if (!donationElement) return;

        donationElement.textContent = 'Charging...';

        try {
            const response = await fetch(`${API_BASE}/balance`); // ✅We use /balance, no /donation
            if (!response.ok) throw new Error('Could not connect to server');

            const data = await response.json();
            if (data.success && data.address) {
                donationElement.textContent = data.address;
            } else {
                donationElement.textContent = 'Not available';
            }
        } catch (error) {
            console.error('Error loading donation address:', error);
            donationElement.textContent = 'Upload failed, please try again later.';
        }
    }

    // Copy to the clipboard
    const copyBtn = document.getElementById('copyBtn');
    if (copyBtn) {
        copyBtn.addEventListener('click', () => {
            const donationElement = document.getElementById('donationAddress');
            if (!donationElement) {
                alert('Address item not found.');
                return;
            }

            const address = donationElement.textContent.trim();
            if (!address || address.includes('Charging') || address.includes('unsuccessful')) {
                alert('Address is not available yet. Please wait.');
                return;
            }

            navigator.clipboard.writeText(address).then(() => {
                copyBtn.textContent = 'Copy!!';
                setTimeout(() => {
                    copyBtn.textContent = '📋 Copy';
                }, 2000);
            }).catch(err => {
                console.error('Copy failed:', err);
                alert('Failed to copy, please try manually.');
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

                    const title = document.createElement('h3');
                    title.textContent = '🔑 Address';
                    card.appendChild(title);

                    const addressDiv = document.createElement('div');
                    addressDiv.className = 'address';
                    addressDiv.textContent = tx.shortAddress || 'N/A';
                    card.appendChild(addressDiv);

                    const dateDiv = document.createElement('div');
                    dateDiv.className = 'date';
                    dateDiv.textContent = '🕒 ' + (tx.date || 'N/A');
                    card.appendChild(dateDiv);

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