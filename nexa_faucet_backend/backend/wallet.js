// wallet.js
require('dotenv').config();
const { Wallet } = require('nexa-wallet-sdk');

let walletInstance = null;

function getWallet() {
    if (!walletInstance) {
        const mnemonic = process.env.MNEMONIC;
        if (!mnemonic) {
            throw new Error('MNEMONIC no definido en .env');
        }
        walletInstance = new Wallet(mnemonic);
    }
    return walletInstance;
}

async function getBalance() {
    const wallet = getWallet();
    try {
        const response = await fetch(`https://api.nexa.org/v1/address/${wallet.address}`);
        const data = await response.json();
        return data.balance;
    } catch (error) {
        console.error('❌ Error al obtener saldo:', error.message);
        throw new Error('No se pudo obtener el saldo de la faucet');
    }
}

// ✅ ¡ESTA ES LA FUNCIÓN QUE ENVÍA NEXA REAL!
async function sendFaucet(toAddress, amountSatoshis) {
    const wallet = getWallet();
    try {
        const txid = await wallet.send(toAddress, amountSatoshis);
        console.log(`✅ Transacción real enviada: ${txid} → ${amountSatoshis / 100000000} NEXA a ${toAddress}`);
        return txid;
    } catch (error) {
        console.error('❌ Error enviando NEXA real:', error.message);
        throw new Error('No se pudo enviar NEXA real. Verifica saldo o red.');
    }
}

module.exports = { getWallet, getBalance, sendFaucet };