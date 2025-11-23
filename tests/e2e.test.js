// tests/e2e.test.js
const axios = require('axios');

// Configuración de URLs (Ajusta los puertos si cambiaste algo)
const LAMBDA_URL = 'http://localhost:3000/orchestrator/create-and-confirm-order';
const CUSTOMERS_URL = 'http://localhost:3001';
const ORDERS_URL = 'http://localhost:3002';

// Generador de datos aleatorios para no chocar con pruebas anteriores
const generateId = () => Math.floor(Math.random() * 100000);
const uniqueEmail = `test.e2e.${generateId()}@company.com`;
const uniqueSku = `SKU-E2E-${generateId()}`;
const idempotencyKey = `KEY-${generateId()}`;

describe('E2E System Flow', () => {
    let customerId;
    let productId;

    // 1. PREPARACIÓN: Crear datos base necesarios
    test('Paso 1: Crear un Cliente en Customers API', async () => {
        const res = await axios.post(`${CUSTOMERS_URL}/customers`, {
            name: "E2E Test User",
            email: uniqueEmail,
            phone: "+1234567890"
        });
        expect(res.status).toBe(201);
        customerId = res.data.id;
        console.log('✅ Cliente creado ID:', customerId);
    });

    test('Paso 2: Crear un Producto en Orders API', async () => {
        const res = await axios.post(`${ORDERS_URL}/products`, {
            sku: uniqueSku,
            name: "E2E Test Product",
            price_cents: 1000, // $10.00
            stock: 50
        });
        expect(res.status).toBe(201);
        productId = res.data.id;
        console.log('✅ Producto creado ID:', productId);
    });

    // 2. PRUEBA DEL ORQUESTADOR (El núcleo del challenge)
    test('Paso 3: Ejecutar Lambda Orquestador (Crear + Confirmar)', async () => {
        const payload = {
            customer_id: customerId,
            items: [{ product_id: productId, qty: 5 }],
            idempotency_key: idempotencyKey,
            correlation_id: "E2E-TEST-RUN"
        };

        const res = await axios.post(LAMBDA_URL, payload);

        // Validaciones
        expect(res.status).toBe(201);
        expect(res.data.success).toBe(true);
        expect(res.data.data.order.status).toBe('CONFIRMED');
        expect(res.data.data.order.total_cents).toBe(5000); // 5 * 1000
        
        console.log('✅ Lambda ejecutado exitosamente. Orden:', res.data.data.order.id);
    });

    // 3. VERIFICACIÓN DE EFECTOS COLATERALES
    test('Paso 4: Verificar que el stock se descontó', async () => {
        const res = await axios.get(`${ORDERS_URL}/products/${productId}`);
        // Teníamos 50, compramos 5 -> debe quedar 45
        expect(res.data.stock).toBe(45);
        console.log('✅ Stock verificado correctamente.');
    });

    // 4. PRUEBA DE IDEMPOTENCIA (Replay)
    test('Paso 5: Verificar Idempotencia (Reenviar mismo request al Lambda)', async () => {
        const payload = {
            customer_id: customerId,
            items: [{ product_id: productId, qty: 5 }],
            idempotency_key: idempotencyKey, // MISMA LLAVE
            correlation_id: "E2E-TEST-RUN"
        };

        const res = await axios.post(LAMBDA_URL, payload);

        expect(res.status).toBe(201);
        // El stock NO debe haber bajado más (seguir en 45)
        const productRes = await axios.get(`${ORDERS_URL}/products/${productId}`);
        expect(productRes.data.stock).toBe(45);
        
        console.log('✅ Idempotencia verificada. Stock intacto.');
    });
});