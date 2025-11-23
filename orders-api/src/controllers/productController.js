const { z } = require('zod');
const productService = require('../services/productService');

const createProductSchema = z.object({
    sku: z.string().min(1, "SKU is required"),
    name: z.string().min(1, "Name is required"),
    price_cents: z.number().int().positive("Price must be positive integer"),
    stock: z.number().int().min(0, "Stock cannot be negative")
});

const updateProductSchema = z.object({
    name: z.string().optional(),
    price_cents: z.number().int().positive().optional(),
    stock: z.number().int().min(0).optional()
});

class ProductController {
    constructor(service) {
        this.service = service;
    }

    create = async (req, res) => {
        try {
            const validated = createProductSchema.parse(req.body);
            const product = await this.service.createProduct(validated);
            res.status(201).json(product);
        } catch (error) {
            this.handleError(res, error);
        }
    };

    update = async (req, res) => {
        try {
            const { id } = req.params;
            const validated = updateProductSchema.parse(req.body);
            const product = await this.service.updateProduct(id, validated);
            res.json(product);
        } catch (error) {
            this.handleError(res, error);
        }
    };

    getOne = async (req, res) => {
        try {
            const product = await this.service.getProduct(req.params.id);
            res.json(product);
        } catch (error) {
            this.handleError(res, error);
        }
    };

    search = async (req, res) => {
        try {
            const { search, limit, cursor } = req.query;
            const result = await this.service.listProducts({ search, limit, cursor });
            res.json(result);
        } catch (error) {
            this.handleError(res, error);
        }
    };

    handleError(res, error) {
        if (error instanceof z.ZodError) return res.status(400).json({ error: error.errors });
        if (error.message === 'SKU_ALREADY_EXISTS') return res.status(409).json({ error: 'SKU already exists' });
        if (error.message === 'PRODUCT_NOT_FOUND') return res.status(404).json({ error: 'Product not found' });
        
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}

module.exports = new ProductController(productService);