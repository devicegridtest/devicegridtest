// wallet.js
require('dotenv').config();
const { Wallet } = require('nexa-wallet-sdk'); // Asegúrate de tener este paquete

let walletInstance = null;

function getWallet() {
    if (!walletInstance) {
        const mnemonic = process.env.MNEMONIC;
        if (!mnemonic) {
            throw new Error('MNEMONIC no definido en .env');
        }

        try {
            walletInstance = new Wallet(mnemonic);
            // ✅ Forzar la generación de la dirección
            if (!walletInstance.address) {
                console.error('❌ La billetera no generó una dirección válida. Verifica el MNEMONIC.');
                throw new Error('No se pudo derivar la dirección desde el mnemonic');
            }
        } catch (error) {
            console.error('❌ Error al crear billetera:', error.message);
            throw new Error('Mnemonic inválido o incompatible con nexa-wallet-sdk');
        }
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

async function sendFaucet(toAddress, amountSatoshis) {
    const wallet = getWallet();
    try {
        const txid = await wallet.send(toAddress, amountSatoshis);
        return txid;
    } catch (error) {
        console.error('❌ Error al enviar NEXA:', error.message);
        throw new Error('No se pudo enviar la transacción');
    }
}

module.exports = { getWallet, getBalance, sendFaucet };
