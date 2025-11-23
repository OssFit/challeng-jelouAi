const express = require('express');
const cors = require('cors');
const config = require('./config/envs');

const swaggerUi = require('swagger-ui-express');
const YAML = require('yamljs');
const path = require('path');

const app = express();

const swaggerDocument = YAML.load(path.join(__dirname, '../openapi.yaml'));
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

app.use(cors());
app.use(express.json());

const productRoutes = require('./routes/productRoutes');
const orderRoutes = require('./routes/orderRoutes');

app.use('/products', productRoutes);
app.use('/orders', orderRoutes);

app.get('/health', (req, res) => {
    res.json({ status: 'OK', service: 'Orders API' });
});

app.listen(config.PORT, () => {
    console.log(`🚀 Orders API running on http://localhost:${config.PORT}`);
    console.log(`📄 Documentation available at http://localhost:${config.PORT}/api-docs`);
});