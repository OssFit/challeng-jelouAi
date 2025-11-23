// src/scripts/migrate.js
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const config = require('../src/config/envs'); // Importamos la config validada

const migrate = async () => {
    // Ajustamos la ruta: src/scripts -> src -> orders-api -> root -> db
    const schemaPath = path.join(__dirname, '../../db/schema.sql');
    
    console.log(`🚀 Iniciando migración Orders API desde: ${schemaPath}`);

    if (!fs.existsSync(schemaPath)) {
        console.error('❌ Error: No se encuentra el archivo schema.sql');
        process.exit(1);
    }

    // Conexión estándar (Segura, sin multipleStatements)
    const connection = await mysql.createConnection({
        host: config.DB_HOST,
        user: config.DB_USER,
        password: config.DB_PASSWORD,
        database: config.DB_NAME,
        port: config.DB_PORT
    });

    try {
        const sqlContent = fs.readFileSync(schemaPath, 'utf8');

        // 1. Limpieza de comentarios
        const cleanSql = sqlContent.replace(/--.*$/gm, '');

        // 2. Separar por punto y coma para ejecución segura secuencial
        const statements = cleanSql
            .split(';')
            .map(stmt => stmt.trim())
            .filter(stmt => stmt.length > 0);

        console.log(`🔍 Se encontraron ${statements.length} sentencias SQL.`);

        for (const statement of statements) {
            await connection.query(statement);
        }

        console.log('✅ Migración completada exitosamente.');
    } catch (error) {
        console.error('❌ Error en la migración:', error.message);
        process.exit(1);
    } finally {
        await connection.end();
    }
};

migrate();