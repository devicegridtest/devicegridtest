// wallet-direct.js
require('dotenv').config();
const axios = require('axios');
const bip39 = require('bip39');
const { BIP32Factory } = require('bip32');
const ecc = require('tiny-secp256k1');
const { networks, payments } = require('bitcoinjs-lib');

// ✅ Crear instancia de BIP32 con tiny-secp256k1
const bip32 = BIP32Factory(ecc);

// 🔑 Configuración de red Nexa (basada en Bitcoin Cash)
// NOTA: Nexa usa un formato de dirección personalizado, pero para pruebas usamos formato BCH
const NEXA_NETWORK = {
    messagePrefix: '\x18Nexa Signed Message:\n',
    bech32: 'nexa',
    bip32: {
        public: 0x0488b21e,  // xpub
        private: 0x0488ade4, // xprv
    },
    pubKeyHash: 0x1c,  // Direcciones legacy P2PKH (similar a BCH)
    scriptHash: 0x1f,  // Direcciones P2SH
    wif: 0x80,         // Clave privada WIF
};

// ✅ Derivar dirección desde mnemonic (formato legacy P2PKH)
function getAddressFromMnemonic(mnemonic) {
    try {
        const seed = bip39.mnemonicToSeedSync(mnemonic);
        const root = bip32.fromSeed(seed, NEXA_NETWORK);
        const child = root.derivePath("m/44'/245'/0'/0/0"); // Path para Nexa (SLIP-0044: 245)
        
        // Generar dirección P2PKH (legacy) - formato base58
        const { address } = payments.p2pkh({
            pubkey: child.publicKey,
            network: NEXA_NETWORK
        });
        
        return address;
    } catch (error) {
        throw new Error(`Error al derivar dirección: ${error.message}`);
    }
}

// ✅ Obtener saldo de una dirección (usando API pública de Nexa)
async function getBalance(address) {
    try {
        // Usar API de Blockchair para Nexa
        const response = await axios.get(`https://api.blockchair.com/nexa/dashboards/address/${address}`);
        const data = response.data;
        
        if (data.context.code !== 200) {
            throw new Error('Dirección no encontrada o error en la API');
        }
        
        // Blockchair devuelve el saldo en satoshis
        const balanceSatoshis = data.data[address].address.balance;
        return balanceSatoshis;
    } catch (error) {
        console.error('❌ Error al obtener saldo:', error.response?.data || error.message);
        throw new Error('No se pudo obtener el saldo de la dirección');
    }
}

// ✅ Enviar NEXA (transacción)
async function sendNexa(fromAddress, toAddress, amountSatoshis, mnemonic) {
    // NOTA: Esta función requiere firmar transacciones manualmente.
    // Como no podemos firmar sin clave privada expuesta, 
    // esta función es solo ilustrativa. Para producción, usa una billetera firmadora.

    // 💡 EN PRODUCCIÓN: Usa una billetera con clave privada en memoria o hardware.
    // Por ahora, usaremos solo lectura de saldo y envío manual desde tu wallet.

    throw new Error(
        '⚠️ Envío de fondos requiere firma privada. Para pruebas, usa una wallet como Liquality o Nexa Wallet y envía manualmente.'
    );
}

// ✅ Función principal de prueba
async function test() {
    try {
        if (!process.env.MNEMONIC) {
            throw new Error('❌ MNEMONIC no definido en .env');
        }

        const mnemonic = process.env.MNEMONIC.trim();

        // Validar mnemonic
        if (!bip39.validateMnemonic(mnemonic)) {
            throw new Error('❌ Mnemonic inválido. Debe ser una lista válida de 12 o 24 palabras.');
        }

        // Generar dirección
        const address = getAddressFromMnemonic(mnemonic);
        console.log('🔑 Dirección generada:', address);

        // Obtener saldo
        const balanceSatoshis = await getBalance(address);
        const balanceNEXA = balanceSatoshis / 100000000;

        console.log('✅ ¡Billetera cargada correctamente!');
        console.log('💰 Saldo:', balanceNEXA.toFixed(8), 'NEXA');

        // Si quieres enviar fondos, hazlo manualmente desde tu wallet.
        // La API de Nexa no permite envíos sin firma privada en cliente.
        console.log('\n💡 Para enviar fondos:');
        console.log('   1. Abre tu wallet (Liquality, Nexa Wallet)');
        console.log('   2. Pega esta dirección como destino');
        console.log('   3. Envía los NEXA manualmente');
        console.log('   4. Vuelve a ejecutar este script para ver el nuevo saldo.');

    } catch (error) {
        console.error('❌ Error al cargar billetera:', error.message);
        console.error('📝 Stack:', error.stack);
        process.exit(1);
    }
}

// Ejecutar prueba
test();