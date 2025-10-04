// generate-wallet.js
const { Wallet } = require('@nexajs/wallet');

try {
    // Genera una nueva billetera aleatoria (¡este mnemonic siempre es válido!)
    const wallet = new Wallet();
    
    console.log('🔑 NUEVO MNEMONIC (GUÁRDALO EN SECRETO):', wallet.mnemonic);
    console.log('📬 Dirección:', wallet.address);
    console.log('✅ ¡Este mnemonic es 100% compatible con @nexajs/wallet!');
} catch (error) {
    console.error('❌ Error al generar billetera:', error.message);
}