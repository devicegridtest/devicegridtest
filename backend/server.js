// server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { getWallet, getBalance, sendFaucet } = require('./wallet');
const { canRequest, saveRequest } = require('./database');
const bech32 = require('bech32');

const app = express();
const PORT = process.env.PORT || 10000;

// ✅ CORS
app.use(cors({
    origin: [
        'null',
        'http://localhost:3000',
        'http://127.0.0.1:5500',
        'http://127.0.0.1:8080',    
        'https://devicegridtest.org'    
    ],
    credentials: true,
    optionsSuccessStatus: 200
}));

app.use(express.json());

// Middleware of logging
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});

//Root path:
app.get('/', (req, res) => {
    res.json({
        message: "🚀 Nexa Faucet Backend",
        endpoints: {
            health: "GET /health",
            balance: "GET /balance",
            faucet: "POST /faucet",
            transactions: "GET /transactions",
            reload: "POST /reload",
            "clear-cooldown": "POST /clear-cooldown"
        }
    });
});

// Health Path
app.get('/health', (req, res) => {
    res.json({ status: 'OK', message: 'Faucet Backend Active' });
});

// ✅ Address Validation
function isValidNexaAddress(address) {
    if (!address || typeof address !== 'string') return false;
    const prefix = 'nexa:';
    if (!address.startsWith(prefix)) return false;

    const bech32Data = address.slice(prefix.length);
    try {
        const { data } = bech32.decode(bech32Data, 702);
        return data.length === 20; // 20 bytes = P2WPKH (Nexa)
    } catch {
        return false;
    }
}

// 🚀  PRINCIPAL ROUTE:Send real funds
app.post('/faucet', async (req, res) => {
    const { address } = req.body;

    try {
        if (!address || typeof address !== 'string') {
            return res.status(400).json({ error: 'Street address required' });
        }

        if (!isValidNexaAddress(address)) {
            return res.status(400).json({ error: 'Invalid Nexa Address' });
        }

        const allowed = await canRequest(address);
        if (!allowed) {
            return res.status(429).json({ 
                error: "You've already applied for funds. Please wait 24 hours."
            });
        }

        const balance = await getBalance();
        const amount = parseInt(process.env.FAUCET_AMOUNT) || 1000000;

        if (balance < amount) {
            return res.status(500).json({ 
                error: 'Faucet without sufficient funds. Please, recharge manually.' 
            });
        }

        // ✅ ¡Submit Transaction!
        let txid;
        try {
            txid = await sendFaucet(address, amount);
            await saveRequest(address);

            console.log(`✅Sent${amount / 100000000} NEXA to ${address}. TXID: ${txid}`);

            // 📢NOTIFICATION TO Discord
            if (process.env.DISCORD_WEBHOOK_URL) {
                try {
                    await fetch(process.env.DISCORD_WEBHOOK_URL, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            embeds: [{
                                title: "💧 ¡New transaction in faucet!",
                                color: 5814783,
                                fields: [
                                    { name: "Address", value: `\`${address}\``, inline: true },
                                    { name: "Amount", value: `${amount / 100000000} NEXA`, inline: true },
                                    { name: "TXID", value: `[View in explorer](https://explorer.nexa.org/tx/${txid})`, inline: false }
                                ],
                                timestamp: new Date().toISOString(),
                                footer: { text: "Nexa Faucet" }
                            }]
                        })
                    });
                    console.log('✅ Notification sent to Discord');
                } catch (err) {
                    console.error('❌ Error Sending Discord:', err.message);
                }
            }

            // ✅ 1 = Successful response
            res.json({
                success: true,
                txid,
                amount,
                message: `Sent ${amount / 100000000} NEXA to ${address}`
            });

        } catch (sendError) {
            console.error('❌ Error sending transaction:', sendError.message);
            res.status(500).json({ 
                error: 'The transaction could not be sent. Verify your wallet or balance.',
                details: sendError.message
            });
        }

    } catch (error) {
        console.error('❌ Error in faucet:', error.message);
        res.status(500).json({ 
            error: 'Internal Server Error',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// 🔁 Get balance
app.get('/balance', async (req, res) => {
    try {
        const wallet = getWallet();
        const balance = await getBalance();
        const balanceInNEXA = (balance / 100000000).toFixed(4);

        res.json({
            success: true,
            balance,
            balanceInNEXA,
            address: wallet.address
        });
    } catch (error) {
        console.error('Error getting balance:', error);
        res.status(500).json({ error: 'Could not get balance' });
    }
});

// 📊 Latest transactions
app.get('/transactions', (req, res) => {
    const db = require('./database').db;
    db.all(`
        SELECT address, last_request 
        FROM requests 
        ORDER BY last_request DESC 
        LIMIT 5
    `, [], (err, rows) => {
        if (err) {
            console.error('Error getting transactions:', err);
            return res.status(500).json({ error: 'Error getting transactions' });
        }

         console.log(rows);

        const transactions = rows.map(row => ({
            address: row.address,
            date: new Date(row.last_request).toLocaleString('es-ES'),
            shortAddress: row.address.substring(0, 12) + '...'
        }));

        res.json({ success: true, transactions });
    });
});

// ⛔Path not found
app.use('*', (req, res) => {
    res.status(404).json({ error: 'Path not found' });
});

// ✅Start Server
try {
    app.listen(PORT, '0.0.0.0', () => {
        console.log(`🚀 Faucet Backend running in port ${PORT}`);
        console.log(`💡 Usa POST /faucetto apply for funds`);
        console.log(`📊 Balance: GET /balance`);
        console.log(`📡 Transactions: GET /transactions`);
        console.log(`🔑 Faucet Address: ${getWallet().address}`);
    });
} catch (error) {
    console.error('❌Server Start Failed:', error);
    process.exit(1);
}