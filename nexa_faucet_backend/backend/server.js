// server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { getWallet, getBalance, sendFaucet } = require('./wallet');
const { canRequest, saveRequest } = require('./database');
const bech32 = require('bech32');

const app = express();
const PORT = process.env.PORT || 10000;

// ✅ CORS: Sin espacios, con orden correcto
app.use(cors({
    origin: [
        'null',
        'http://localhost:3000',
        'http://127.0.0.1:5500',
        'http://127.0.0.1:8080',
        'https://tudominio.com',       // ✅ Sin espacios
        'https://devicegridtest.org'    // ✅ Sin espacios
    ],
    credentials: true,
    optionsSuccessStatus: 200
}));

app.use(express.json());

// Middleware de logging
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});

// Ruta raíz
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

// Ruta de salud
app.get('/health', (req, res) => {
    res.json({ status: 'OK', message: 'Faucet Backend Activo' });
});

// ✅ VALIDACIÓN DE DIRECCIÓN NEXA
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

// 🚀 RUTA PRINCIPAL: Enviar fondos reales
app.post('/faucet', async (req, res) => {
    const { address } = req.body;

    try {
        if (!address || typeof address !== 'string') {
            return res.status(400).json({ error: 'Dirección requerida' });
        }

        if (!isValidNexaAddress(address)) {
            return res.status(400).json({ error: 'Dirección Nexa inválida' });
        }

        const allowed = await canRequest(address);
        if (!allowed) {
            return res.status(429).json({ 
                error: 'Ya solicitaste fondos. Espera 24 horas.' 
            });
        }

        const balance = await getBalance();
        const amount = parseInt(process.env.FAUCET_AMOUNT) || 1000000;

        if (balance < amount) {
            return res.status(500).json({ 
                error: 'Faucet sin fondos suficientes. Por favor, recárgala manualmente.' 
            });
        }

        // ✅ ¡ENVIAR TRANSACCIÓN REAL!
        let txid;
        try {
            txid = await sendFaucet(address, amount);
            await saveRequest(address);

            console.log(`✅ Enviado ${amount / 100000000} NEXA a ${address}. TXID: ${txid}`);

            // 📢 Notificación a Discord
            if (process.env.DISCORD_WEBHOOK_URL) {
                try {
                    await fetch(process.env.DISCORD_WEBHOOK_URL, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            embeds: [{
                                title: "💧 ¡Nueva transacción en la faucet!",
                                color: 5814783,
                                fields: [
                                    { name: "Dirección", value: `\`${address}\``, inline: true },
                                    { name: "Monto", value: `${amount / 100000000} NEXA`, inline: true },
                                    { name: "TXID", value: `[Ver en explorer](https://explorer.nexa.org/tx/${txid})`, inline: false }
                                ],
                                timestamp: new Date().toISOString(),
                                footer: { text: "Nexa Faucet" }
                            }]
                        })
                    });
                    console.log('✅ Notificación enviada a Discord');
                } catch (err) {
                    console.error('❌ Error enviando a Discord:', err.message);
                }
            }

            // ✅ Respuesta exitosa
            res.json({
                success: true,
                txid,
                amount,
                message: `Enviados ${amount / 100000000} NEXA a ${address}`
            });

        } catch (sendError) {
            console.error('❌ Error al enviar transacción:', sendError.message);
            res.status(500).json({ 
                error: 'No se pudo enviar la transacción. Verifica tu billetera o el saldo.',
                details: sendError.message
            });
        }

    } catch (error) {
        console.error('❌ Error en faucet:', error.message);
        res.status(500).json({ 
            error: 'Error interno del servidor',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// 🔁 Obtener saldo
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
        console.error('Error obteniendo saldo:', error);
        res.status(500).json({ error: 'No se pudo obtener saldo' });
    }
});

// 📊 Últimas transacciones
app.get('/transactions', (req, res) => {
    const db = require('./database').db;
    db.all(`
        SELECT address, last_request 
        FROM requests 
        ORDER BY last_request DESC 
        LIMIT 5
    `, [], (err, rows) => {
        if (err) {
            console.error('Error obteniendo transacciones:', err);
            return res.status(500).json({ error: 'Error obteniendo transacciones' });
        }

        const transactions = rows.map(row => ({
            address: row.address,
            date: new Date(row.last_request).toLocaleString('es-ES'),
            shortAddress: row.address.substring(0, 12) + '...'
        }));

        res.json({ success: true, transactions });
    });
});

// 🔄 Recargar faucet (simulado)
app.post('/reload', async (req, res) => {
    const { amount } = req.body;
    if (!amount || !Number.isInteger(amount) || amount <= 0) {
        return res.status(400).json({ error: 'Monto inválido' });
    }
    console.log(`🔁 Recargando faucet con ${amount / 100000000} NEXA`);
    res.json({ success: true, message: `Recargado: ${amount / 100000000} NEXA` });
});

// 🧹 Limpiar cooldowns
app.post('/clear-cooldown', async (req, res) => {
    try {
        const db = require('./database').db;
        db.run('DELETE FROM requests', (err) => {
            if (err) {
                return res.status(500).json({ error: 'Error al limpiar cooldowns' });
            }
            console.log('🧹 Todos los cooldowns han sido eliminados');
            res.json({ success: true, message: 'Cooldowns limpiados' });
        });
    } catch (error) {
        console.error('❌ Error al limpiar cooldowns:', error.message);
        res.status(500).json({ error: 'Error interno' });
    }
});

// ⛔ Ruta no encontrada
app.use('*', (req, res) => {
    res.status(404).json({ error: 'Ruta no encontrada' });
});

// ✅ Iniciar servidor
try {
    app.listen(PORT, '0.0.0.0', () => {
        console.log(`🚀 Faucet Backend corriendo en puerto ${PORT}`);
        console.log(`💡 Usa POST /faucet para solicitar fondos`);
        console.log(`📊 Saldo: GET /balance`);
        console.log(`📡 Transacciones: GET /transactions`);
        console.log(`🔑 Dirección de la faucet: ${getWallet().address}`);
    });
} catch (error) {
    console.error('❌ Error fatal al iniciar servidor:', error);
    process.exit(1);
}