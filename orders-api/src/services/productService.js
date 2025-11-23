const productRepository = require('../repositories/productRepository');

class ProductService {
    constructor(repository) {
        this.repository = repository;
    }

    async createProduct(data) {
        const existing = await this.repository.findBySku(data.sku);
        if (existing) {
            throw new Error('SKU_ALREADY_EXISTS');
        }
        return await this.repository.create(data);
    }

    async getProduct(id) {
        const product = await this.repository.findById(id);
        if (!product) throw new Error('PRODUCT_NOT_FOUND');
        return product;
    }

    async updateProduct(id, data) {
        const product = await this.repository.findById(id);
        if (!product) throw new Error('PRODUCT_NOT_FOUND');

        return await this.repository.update(id, data);
    }

    async listProducts({ search, limit, cursor }) {
        const limitParsed = parseInt(limit) || 10;
        
        const products = await this.repository.findAll({ 
            search, 
            limit: limitParsed, 
            cursor 
        });

        let nextCursor = null;
        if (products.length > 0) {
            nextCursor = products[products.length - 1].id;
            if (products.length < limitParsed) {
                nextCursor = null;
            }
        }

        return {
            data: products,
            pagination: {
                nextCursor,
                limit: limitParsed
            }
        };
    }
}

module.exports = new ProductService(productRepository);