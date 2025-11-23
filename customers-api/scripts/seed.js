// scripts/seed.js
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const config = require('../src/config/envs');

const seed = async () => {
    const seedPath = path.join(__dirname, '../../db/seed.sql');
    
    console.log(`🌱 Iniciando seeding desde: ${seedPath}`);

    if (!fs.existsSync(seedPath)) {
        console.error('❌ Error: No se encuentra el archivo seed.sql');
        process.exit(1);
    }

    const sql = fs.readFileSync(seedPath, 'utf8');

    const connection = await mysql.createConnection({
        host: config.DB_HOST,
        user: config.DB_USER,
        password: config.DB_PASSWORD,
        database: config.DB_NAME,
        port: config.DB_PORT,
        multipleStatements: true
    });

    try {
        console.log('⏳ Insertando datos de prueba...');
        await connection.query(sql);
        console.log('✅ Base de datos poblada exitosamente.');
    } catch (error) {
        console.error('❌ Error en el seeding:', error.message);
    } finally {
        await connection.end();
    }
};

seed();