const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');

router.post('/', productController.create.bind(productController));
router.get('/:id', productController.getOne.bind(productController));
router.patch('/:id', productController.update.bind(productController));
router.get('/', productController.search.bind(productController));

module.exports = router;