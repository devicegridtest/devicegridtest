const sqlite3 = require('sqlite3').verbose();
const path = require('path');

/**
 * Configuración de la base de datos
 * - En modo test: usa base de datos en memoria
 * - En producción/desarrollo: usa archivo físico
 */
const dbPath = process.env.NODE_ENV === 'test' 
    ? ':memory:' 
    : path.join(__dirname, 'faucet.db');

// Crear conexión a la base de datos
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('❌ Error al conectar con la base de datos:', err.message);
    } else {
        console.log('✅ Conexión a la base de datos establecida correctamente');
    }
});

/**
 * Inicializa la base de datos creando las tablas necesarias
 */
function initializeDatabase() {
    return new Promise((resolve, reject) => {
        db.serialize(() => {
            db.run(`
                CREATE TABLE IF NOT EXISTS requests (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    address TEXT UNIQUE NOT NULL,
                    last_request INTEGER NOT NULL,
                    ip_address TEXT,
                    created_at INTEGER DEFAULT (strftime('%s', 'now'))
                )
            `, (err) => {
                if (err) {
                    console.error('❌ Error al crear la tabla requests:', err.message);
                    reject(err);
                } else {
                    console.log('✅ Tabla "requests" creada/verificada correctamente');
                    resolve();
                }
            });
        });
    });
}

/**
 * Verifica si una dirección puede hacer una nueva solicitud
 * @param {string} address - Dirección Nexa
 * @returns {Promise<boolean>} - True si puede solicitar, False si está en cooldown
 */
function canRequest(address) {
    return new Promise((resolve, reject) => {
        if (!address) {
            return reject(new Error('La dirección no puede estar vacía'));
        }

        db.get(
            `SELECT last_request FROM requests WHERE address = ?`, 
            [address], 
            (err, row) => {
                if (err) {
                    console.error('❌ Error al verificar cooldown:', err.message);
                    return reject(err);
                }

                if (!row) {
                    // Primera vez que se solicita
                    return resolve(true);
                }

                // Calcular cooldown
                const cooldown = parseInt(process.env.COOLDOWN_MS) || 86400000; // 24 horas por defecto
                const now = Date.now();
                const canRequest = (now - row.last_request) > cooldown;

                if (!canRequest) {
                    const remaining = Math.ceil((row.last_request + cooldown - now) / 1000);
                    console.log(`⏳ Dirección ${address} en cooldown. Tiempo restante: ${remaining} segundos`);
                }

                resolve(canRequest);
            }
        );
    });
}

/**
 * Guarda una solicitud en la base de datos
 * @param {string} address - Dirección Nexa
 * @param {string} ipAddress - Dirección IP del solicitante (opcional)
 * @returns {Promise<void>}
 */
function saveRequest(address, ipAddress = null) {
    return new Promise((resolve, reject) => {
        if (!address) {
            return reject(new Error('La dirección no puede estar vacía'));
        }

        const now = Date.now();
        db.run(
            `INSERT OR REPLACE INTO requests (address, last_request, ip_address) VALUES (?, ?, ?)`,
            [address, now, ipAddress],
            function(err) { // Usamos function() para acceder a this.lastID
                if (err) {
                    console.error('❌ Error al guardar la solicitud:', err.message);
                    return reject(err);
                }
                
                console.log(`✅ Solicitud guardada para ${address} (ID: ${this.lastID})`);
                resolve();
            }
        );
    });
}

/**
 * Obtiene estadísticas de la faucet
 * @returns {Promise<Object>} - Estadísticas de uso
 */
function getStats() {
    return new Promise((resolve, reject) => {
        db.get(`
            SELECT 
                COUNT(*) as total_requests,
                MAX(last_request) as last_request_time
            FROM requests
        `, [], (err, row) => {
            if (err) {
                console.error('❌ Error al obtener estadísticas:', err.message);
                return reject(err);
            }
            resolve(row || { total_requests: 0, last_request_time: null });
        });
    });
}

/**
 * Cierra la conexión a la base de datos
 * Importante para pruebas y reinicios
 */
function closeDatabase() {
    return new Promise((resolve, reject) => {
        db.close((err) => {
            if (err) {
                console.error('❌ Error al cerrar la base de datos:', err.message);
                reject(err);
            } else {
                console.log('✅ Conexión a la base de datos cerrada correctamente');
                resolve();
            }
        });
    });
}

// Inicializar la base de datos al cargar el módulo
initializeDatabase().catch(err => {
    console.error('❌ Error fatal al inicializar la base de datos:', err.message);
    process.exit(1); // Salir si no se puede inicializar la DB
});

// Exportar funciones
module.exports = { 
    canRequest, 
    saveRequest, 
    getStats,
    closeDatabase,
    db,
    initializeDatabase
};