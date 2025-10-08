// wallet.js
require('dotenv').config();
const { Wallet } = require('nexa-wallet-sdk'); // Make sure you have this package

let walletInstance = null;

function getWallet() {
    if (!walletInstance) {
        const mnemonic = process.env.MNEMONIC;
        if (!mnemonic) {
            throw new Error('MNEMONIC not defined in.env');
        }

        try {
            walletInstance = new Wallet(mnemonic);
            // ✅Force address generation
            if (!walletInstance.address) {
                console.error('❌ Wallet did not generate a valid address. Verify the MNEMONIC.');
                throw new Error('Could not derive address from the mnemonic');
            }
        } catch (error) {
            console.error('❌ Error creating wallet:', error.message);
            throw new Error('Mnemonic invalid or incompatible withnexa-wallet-sdk');
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
        console.error('❌ Error getting balance.:', error.message);
        throw new Error('Failed to get faucet balance');
    }
}

async function sendFaucet(toAddress, amountSatoshis) {
    const wallet = getWallet();
    try {
        const txid = await wallet.send(toAddress, amountSatoshis);
        return txid;
    } catch (error) {
        console.error('❌ Failed to send:', error.message);
        throw new Error('Failed to send transaction');
    }
}

module.exports = { getWallet, getBalance, sendFaucet };