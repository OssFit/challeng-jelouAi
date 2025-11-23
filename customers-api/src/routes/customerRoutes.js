const express = require('express');
const router = express.Router();
const customerController = require('../controllers/customerController');

router.post('/', customerController.create.bind(customerController));
router.get('/:id', customerController.getOne.bind(customerController));
router.get('/', customerController.search.bind(customerController));
router.put('/:id', customerController.update.bind(customerController));
router.delete('/:id', customerController.delete.bind(customerController));

module.exports = router;