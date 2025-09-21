document.addEventListener('DOMContentLoaded', () => {
    const addressInput = document.getElementById('address');
    const requestBtn = document.getElementById('requestBtn');
    const messageDiv = document.getElementById('message');

    // ✅ CORREGIDO: Eliminado el espacio en blanco al final
    const API_BASE = 'https://nexa-faucet-backend-5nxc.onrender.com';

    // =============== ADMIN PANEL ===============
    const adminPanel = document.getElementById('adminPanel');
    const openAdminBtn = document.getElementById('openAdminBtn');
    const closeAdmin = document.getElementById('closeAdmin');
    const loginAdmin = document.getElementById('loginAdmin');
    const adminPassword = document.getElementById('adminPassword');
    const reloadFaucet = document.getElementById('reloadFaucet');
    const clearCooldown = document.getElementById('clearCooldown');
    const adminTransactions = document.getElementById('adminTransactions');

    // Verificar que los elementos existen antes de agregar event listeners
    if (openAdminBtn) {
        openAdminBtn.addEventListener('click', () => {
            adminPanel.classList.add('active');
        });
    }

    if (closeAdmin) {
        closeAdmin.addEventListener('click', () => {
            adminPanel.classList.remove('active');
        });
    }

    // Login de admin
    if (loginAdmin) {
        loginAdmin.addEventListener('click', async () => {
            const password = adminPassword.value.trim();
            if (!password) {
                alert('Please enter the password.');
                return;
            }

            try {
                const response = await fetch(`${API_BASE}/admin/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ password }),
                });

                const data = await response.json();
                if (response.ok && data.success && data.token) {
                    localStorage.setItem('adminToken', data.token);
                    loadAdminData();
                    showMessageAdmin('✅ Access granted!', 'success');
                } else {
                    throw new Error(data.error || 'Incorrect password');
                }
            } catch (error) {
                console.error('Login error:', error);
                showMessageAdmin('❌ ' + error.message, 'error');
            }
        });
    }

    // Cargar datos de admin
    async function loadAdminData() {
        const token = localStorage.getItem('adminToken');
        if (!token) return;

        try {
            const response = await fetch(`${API_BASE}/admin/status`, {
                headers: { 'Authorization': `Bearer ${token}` },
            });

            const data = await response.json();
            if (data.success) {
                if (document.getElementById('adminAddress')) {
                    document.getElementById('adminAddress').textContent = data.address || 'N/A';
                }
                if (document.getElementById('adminBalance')) {
                    document.getElementById('adminBalance').textContent = data.balanceInNEXA || '0';
                }

                // Cargar transacciones
                if (adminTransactions) {
                    let html = '';
                    if (Array.isArray(data.recentRequests) && data.recentRequests.length > 0) {
                        data.recentRequests.forEach(req => {
                            html += `
                                <div style="padding: 8px; border-bottom: 1px solid #334155; margin-bottom: 8px;">
                                    <div><strong>Address:</strong> ${req.address.substring(0, 20)}...</div>
                                    <div><strong>Date:</strong> ${new Date(req.timestamp).toLocaleString()}</div>
                                    <div><strong>IP:</strong> ${req.ip || 'N/A'}</div>
                                </div>
                            `;
                        });
                    } else {
                        html = '<p>No recent requests</p>';
                    }
                    adminTransactions.innerHTML = html;
                }
            }
        } catch (error) {
            console.error('Error loading admin data:', error);
            showMessageAdmin('❌ Error loading admin data', 'error');
        }
    }

    // Acciones de admin
    if (reloadFaucet) {
        reloadFaucet.addEventListener('click', async () => {
            const token = localStorage.getItem('adminToken');
            if (!token) {
                alert('You are not authenticated as administrator.');
                return;
            }

            if (!confirm('Are you sure you want to reload the faucet?')) return;

            try {
                const response = await fetch(`${API_BASE}/admin/reload`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json',
                    },
                });

                const data = await response.json();
                if (response.ok && data.success) {
                    showMessageAdmin('✅ Faucet reloaded successfully', 'success');
                    updateBalance(); // Actualizar balance público
                } else {
                    throw new Error(data.error || 'Error reloading faucet');
                }
            } catch (error) {
                console.error('Error reloading faucet:', error);
                showMessageAdmin('❌ ' + error.message, 'error');
            }
        });
    }

    if (clearCooldown) {
        clearCooldown.addEventListener('click', async () => {
            const token = localStorage.getItem('adminToken');
            if (!token) {
                alert('You are not authenticated as administrator.');
                return;
            }

            if (!confirm('Are you sure you want to clear all cooldowns?')) return;

            try {
                const response = await fetch(`${API_BASE}/admin/clear-cooldowns`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json',
                    },
                });

                const data = await response.json();
                if (response.ok && data.success) {
                    showMessageAdmin('✅ Cooldowns cleared successfully', 'success');
                } else {
                    throw new Error(data.error || 'Error clearing cooldowns');
                }
            } catch (error) {
                console.error('Error clearing cooldowns:', error);
                showMessageAdmin('❌ ' + error.message, 'error');
            }
        });
    }

    // Mensaje para admin
    function showMessageAdmin(text, type) {
        const div = document.createElement('div');
        div.className = `message ${type}`;
        div.textContent = text;
        div.style.marginTop = '15px';
        div.style.padding = '10px';
        div.style.borderRadius = '8px';
        div.style.textAlign = 'center';
        
        const content = document.querySelector('.admin-content');
        if (content) {
            content.appendChild(div);
            setTimeout(() => {
                if (div.parentNode) {
                    div.parentNode.removeChild(div);
                }
            }, 5000);
        }
    }

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
            showMessage('⚠️ Please enter an address.', 'error');
            return;
        }

        if (!isValidNexaAddress(address)) {
            showMessage('⚠️ Invalid Nexa address. Must start with "nexa:" and have at least 48 characters.', 'error');
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

            // Actualizar transacciones
            loadTransactions();

        } catch (error) {
            console.error(error);
            showMessage('❌ ' + error.message, 'error');
        } finally {
            requestBtn.disabled = false;
            requestBtn.textContent = 'Request 0.01 NEXA';
        }
    });

    // =============== DONATION ADDRESS ===============
    async function loadDonationAddress() {
        const donationElement = document.getElementById('donationAddress');
        if (!donationElement) return;

        donationElement.textContent = 'Loading...';

        try {
            const response = await fetch(`${API_BASE}/balance`);
            if (!response.ok) throw new Error('Could not connect to server');

            const data = await response.json();
            if (data.success && data.address) {
                donationElement.textContent = data.address;
            } else {
                donationElement.textContent = 'Not available';
            }
        } catch (error) {
            console.error('Error loading donation address:', error);
            donationElement.textContent = 'Load failed. Please try again later.';
        }
    }

    // Copiar al portapapeles
    const copyBtn = document.getElementById('copyBtn');
    if (copyBtn) {
        copyBtn.addEventListener('click', () => {
            const donationElement = document.getElementById('donationAddress');
            if (!donationElement) {
                alert('Address element not found.');
                return;
            }

            const address = donationElement.textContent.trim();
            if (!address || address.includes('Loading') || address.includes('failed')) {
                alert('The address is not yet available. Please wait.');
                return;
            }

            navigator.clipboard.writeText(address).then(() => {
                copyBtn.textContent = 'Copied!';
                setTimeout(() => {
                    copyBtn.textContent = '📋 Copy';
                }, 2000);
            }).catch(err => {
                console.error('Copy error:', err);
                alert('Could not copy. Please try manually.');
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
                        <h3>🔑 Address</h3>
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
                grid.innerHTML = '<p style="text-align:center;color:#ff6b6b">Error loading transactions</p>';
            }
        }
    }

    // Inicializar
    loadDonationAddress();
    loadTransactions();
    setInterval(loadTransactions, 30000);

    // Verificar si ya hay token de admin
    const token = localStorage.getItem('adminToken');
    if (token) {
        loadAdminData();
    }
});