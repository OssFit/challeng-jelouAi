const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');

router.post('/', orderController.create.bind(orderController));
router.get('/:id', orderController.getOne.bind(orderController));

router.post('/:id/confirm', orderController.confirm.bind(orderController));
router.post('/:id/cancel', orderController.cancel.bind(orderController));

module.exports = router;