require('dotenv').config();
const axios = require('axios');
const bip39 = require('bip39');
const { address } = require('bitcoinjs-lib');

const NETWORK = {
    messagePrefix: '\x18Nexa Signed Message:\n',
    bech32: 'nexa',
    bip32: {
        public: 0x0488b21e,
        private: 0x0488ade4,
    },
    pubKeyHash: 0x1c,
    scriptHash: 0x1f,
    wif: 0x80,
};

let cachedWallet = null;

function getWallet() {
    if (!cachedWallet) {
        const mnemonic = process.env.MNEMONIC;
        if (!mnemonic) {
            throw new Error('MNEMONIC no definido en .env');
        }
        if (!bip39.validateMnemonic(mnemonic)) {
            throw new Error('Mnemonic inválido. Debe tener 12 o 24 palabras válidas.');
        }

        const seed = bip39.mnemonicToSeedSync(mnemonic);
        const root = bitcoinjs.bip32.fromSeed(seed);
        const child = root.derivePath("m/44'/145'/0'/0/0");
        const derivedAddress = child.address;

        cachedWallet = { mnemonic, address: derivedAddress };
    }
    return cachedWallet;
}

async function getBalance() {
    const wallet = getWallet();
    try {
        const response = await axios.get(`https://api.nexa.org/v1/address/${wallet.address}`);
        return response.data.balance; // En satoshis
    } catch (error) {
        console.error('❌ Error al obtener saldo:', error.response?.data || error.message);
        throw new Error('No se pudo obtener el saldo de la billetera de la faucet');
    }
}

async function sendFaucet(toAddress, amountSatoshis) {
    // ❗ NO SE PUEDE ENVIAR DESDE EL BACKEND SIN FIRMA PRIVADA.
    // Solo simulamos el envío. El dinero real debe venir de ti.
    throw new Error(
        '🚫 Envío desde backend no permitido. Recarga la faucet manualmente enviando NEXA a: ' +
        getWallet().address
    );
}

module.exports = { getWallet, getBalance, sendFaucet };