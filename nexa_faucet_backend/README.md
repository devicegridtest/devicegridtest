# 💧 Nexa Faucet Backend

Backend para una **faucet de Nexa** desarrollado en **Node.js + Express + SQLite**.  
Permite a los usuarios solicitar fondos de prueba de forma controlada (cooldown de 24h por defecto).  

---

## 🚀 Características
- ✅ API REST con Express
- ✅ Validación de direcciones Nexa
- ✅ Control de cooldown por dirección
- ✅ Registro de solicitudes en SQLite
- ✅ Notificación automática a Discord (opcional)
- ✅ Compatible con Render y entornos de producción
- ✅ Endpoints de salud, balance y transacciones recientes

---

## 📦 Instalación

### 1. Clonar el repositorio
```bash
git clone https://github.com/devicegridtest/nexa_faucet_backend.git
cd nexa_faucet_backend
