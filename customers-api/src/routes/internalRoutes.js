const express = require('express');
const router = express.Router();
const customerController = require('../controllers/customerController');
const { verifyServiceToken } = require('../middlewares/authMiddleware');

// GET /internal/customers/:id
router.get('/customers/:id', 
    verifyServiceToken, 
    customerController.getOne.bind(customerController)
);

module.exports = router;