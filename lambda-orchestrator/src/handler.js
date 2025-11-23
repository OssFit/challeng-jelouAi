const axios = require('axios');

const getHeaders = () => ({
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${process.env.SERVICE_TOKEN}`
});

module.exports.createAndConfirmOrder = async (event) => {
  console.log('🚀 Lambda Invocado. Body:', event.body);

  let body;
  try {
    body = JSON.parse(event.body);
  } catch (e) {
    body = event.body;
  }

  const { customer_id, items, idempotency_key, correlation_id } = body;

  if (!customer_id || !items || !idempotency_key) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Faltan campos requeridos: customer_id, items, idempotency_key' }),
    };
  }

  try {
    console.log(`1️⃣ Validando Cliente ID: ${customer_id}`);
    const customerRes = await axios.get(
      `${process.env.CUSTOMERS_API_URL}/internal/customers/${customer_id}`,
      { headers: getHeaders() }
    );
    const customerData = customerRes.data;

    console.log('2️⃣ Creando Orden en estado CREATED...');
    const createOrderRes = await axios.post(
      `${process.env.ORDERS_API_URL}/orders`,
      { customer_id, items },
      { 
        headers: {
          ...getHeaders(),
          'X-Idempotency-Key': idempotency_key 
        }
      }
    );
    const orderData = createOrderRes.data;

    console.log(`3️⃣ Confirmando Orden ID ${orderData.id} con Key ${idempotency_key}...`);
    const confirmRes = await axios.post(
      `${process.env.ORDERS_API_URL}/orders/${orderData.id}/confirm`,
      {}, 
      {
        headers: {
          ...getHeaders(),
          'X-Idempotency-Key': idempotency_key 
        }
      }
    );
    const confirmedOrderData = confirmRes.data;

    const responsePayload = {
      success: true,
      correlationId: correlation_id || 'N/A',
      data: {
        customer: customerData,
        order: confirmedOrderData
      }
    };

    return {
      statusCode: 201,
      body: JSON.stringify(responsePayload),
    };

  } catch (error) {
    console.error('❌ Error en Orquestación:', error.message);
    
    const status = error.response ? error.response.status : 500;
    const errorMessage = error.response ? error.response.data : { error: error.message };

    return {
      statusCode: status,
      body: JSON.stringify(errorMessage),
    };
  }
};