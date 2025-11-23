const express = require('express');
const cors = require('cors');
const config = require('./config/envs'); 

const customerRoutes = require('./routes/customerRoutes'); // Las normales
const internalRoutes = require('./routes/internalRoutes'); // NUEVO ARCHIVO

const swaggerUi = require('swagger-ui-express');
const YAML = require('yamljs');
const path = require('path');

const app = express();

const swaggerDocument = YAML.load(path.join(__dirname, '../openapi.yaml'));

app.use(cors());
app.use(express.json());

app.use('/customers', customerRoutes);  
app.use('/internal', internalRoutes);  

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

app.get('/health', (req, res) => res.json({ status: 'OK', service: 'Customers API' }));

app.listen(config.PORT, () => {
    console.log(`🚀 Customers API running on http://localhost:${config.PORT}`);
});