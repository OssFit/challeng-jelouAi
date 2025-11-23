// src/scripts/seed.js
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const config = require('../src/config/envs');

const seed = async () => {
    const seedPath = path.join(__dirname, '../../db/seed.sql');
    
    console.log(`🌱 Iniciando seeding Orders API desde: ${seedPath}`);

    if (!fs.existsSync(seedPath)) {
        console.error('❌ Error: No se encuentra el archivo seed.sql');
        process.exit(1);
    }

    const connection = await mysql.createConnection({
        host: config.DB_HOST,
        user: config.DB_USER,
        password: config.DB_PASSWORD,
        database: config.DB_NAME,
        port: config.DB_PORT
    });

    try {
        const sqlContent = fs.readFileSync(seedPath, 'utf8');
        
        // Limpieza y split seguro
        const cleanSql = sqlContent.replace(/--.*$/gm, '');
        const statements = cleanSql
            .split(';')
            .map(stmt => stmt.trim())
            .filter(stmt => stmt.length > 0);

        console.log(`🔍 Insertando datos (${statements.length} sentencias)...`);

        for (const statement of statements) {
            // Usamos try-catch por sentencia para ignorar duplicados si ya existen
            try {
                await connection.query(statement);
            } catch (err) {
                if (err.code === 'ER_DUP_ENTRY') {
                    console.warn('⚠️ Dato duplicado omitido (ya existía).');
                } else {
                    throw err;
                }
            }
        }

        console.log('✅ Seed completado exitosamente.');
    } catch (error) {
        console.error('❌ Error en el seeding:', error.message);
        process.exit(1);
    } finally {
        await connection.end();
    }
};

seed();