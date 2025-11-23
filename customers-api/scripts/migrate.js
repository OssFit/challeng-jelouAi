require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const config = require('../src/config/envs');   

const migrate = async () => {
    const schemaPath = path.join(__dirname, '../../db/schema.sql');
    
    console.log(`🚀 Iniciando migración desde: ${schemaPath}`);

    if (!fs.existsSync(schemaPath)) {
        console.error('❌ Error: No se encuentra el archivo schema.sql');
        process.exit(1);
    }

    const sql = fs.readFileSync(schemaPath, 'utf8');

    const connection = await mysql.createConnection({
        host: config.DB_HOST,
        user: config.DB_USER,
        password: config.DB_PASSWORD,
        database: config.DB_NAME,
        port: config.DB_PORT,
        multipleStatements: true
    });

    try {
        console.log('⏳ Ejecutando sentencias SQL...');
        await connection.query(sql);
        console.log('✅ Migración completada exitosamente.');
    } catch (error) {
        console.error('❌ Error en la migración:', error.message);
    } finally {
        await connection.end();
    }
};

migrate();