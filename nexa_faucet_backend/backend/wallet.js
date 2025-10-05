// backend/wallet.js
require('dotenv').config();
const { Wallet, rostrumProvider } = require('nexa-wallet-sdk');

let walletInstance = null;

const getWallet = async () => {
    if (!walletInstance) {
        const mnemonic = process.env.MNEMONIC;
        if (!mnemonic) throw new Error('MNEMONIC no definido');
        await rostrumProvider.connect('mainnet');
        walletInstance = new Wallet(mnemonic, 'mainnet');
        await walletInstance.initialize();
    }
    return walletInstance;
};

const getBalance = async () => {
    const wallet = await getWallet();
    const account = wallet.accountStore.getAccount('1.0');
    const raw = account.balance.confirmed;

    // Asume que el SDK devuelve satoshis como número
    if (typeof raw === 'number') return Math.floor(raw);
    
    // Si es string, intenta convertir (poco probable en este SDK)
    if (typeof raw === 'string') {
        const num = parseFloat(raw);
        return isNaN(num) ? 0 : Math.floor(num);
    }

    return 0;
};

const sendFaucet = async (toAddress, amountSatoshis) => {
    const wallet = await getWallet();
    const account = wallet.accountStore.getAccount('1.0');
    const tx = await wallet.newTransaction(account)
        .onNetwork('mainnet')
        .sendTo(toAddress, amountSatoshis.toString())
        .populate()
        .sign()
        .build();
    return await wallet.sendTransaction(tx.serialize());
};

const getFaucetAddress = async () => {
    const wallet = await getWallet();
    const account = wallet.accountStore.getAccount('1.0');
    return account.getNewAddress().toString();
};

module.exports = { getWallet, getBalance, sendFaucet, getFaucetAddress };
