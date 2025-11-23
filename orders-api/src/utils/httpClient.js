const axios = require('axios');
const config = require('../config/envs');

const customersApi = axios.create({
    baseURL: config.CUSTOMERS_API_URL,
    headers: {
        'Authorization': `Bearer ${config.SERVICE_TOKEN}`,
        'Content-Type': 'application/json'
    },
    timeout: 5000
});

module.exports = { customersApi };