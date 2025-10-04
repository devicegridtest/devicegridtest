// backend/wallet.js
require('dotenv').config();
const { Wallet, rostrumProvider } = require('nexa-wallet-sdk');

let walletInstance = null;
let accountInstance = null;

async function getWallet() {
    if (!walletInstance) {
        const mnemonic = process.env.MNEMONIC;
        if (!mnemonic) {
            throw new Error('MNEMONIC no definido en .env');
        }

        try {
            // ✅ Conectar al nodo de Nexa
            await rostrumProvider.connect('mainnet'); // Usa 'testnet' si estás en pruebas

            // ✅ Crear billetera
            walletInstance = new Wallet(mnemonic, 'mainnet');
            await walletInstance.initialize(); // ⚠️ Obligatorio

            // ✅ Obtener cuenta predeterminada
            accountInstance = walletInstance.accountStore.getAccount('1.0');
            if (!accountInstance) {
                throw new Error('No se pudo crear la cuenta 1.0');
            }

        } catch (error) {
            console.error('❌ Error al crear billetera:', error.message);
            throw error;
        }
    }
    return walletInstance;
}

async function getBalance() {
    const wallet = await getWallet();
    const account = wallet.accountStore.getAccount('1.0');
    
    // ✅ Devuelve saldo confirmado
    return account.balance.confirmed;
}

async function sendFaucet(toAddress, amountSatoshis) {
    const wallet = await getWallet();
    const account = wallet.accountStore.getAccount('1.0');

    try {
        // ✅ Construye transacción
        const tx = await wallet.newTransaction(account)
            .onNetwork('mainnet')
            .sendTo(toAddress, amountSatoshis.toString()) // manda como string
            .populate()
            .sign()
            .build();

        // ✅ Envía la transacción
        const txid = await wallet.sendTransaction(tx.serialize());
        return txid;

    } catch (error) {
        console.error('❌ Error al enviar NEXA:', error.message);
        throw new Error(`No se pudo enviar: ${error.message}`);
    }
}

module.exports = { getWallet, getBalance, sendFaucet };

// Exporta también la dirección para uso externo
module.exports.getAddress = async () => {
    const wallet = await getWallet();
    const account = wallet.accountStore.getAccount('1.0');
    return account.getNewAddress().toString(); // ✅ Esta es la dirección real
};
