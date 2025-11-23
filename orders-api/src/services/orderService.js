const orderRepository = require('../repositories/orderRepository');
const productRepository = require('../repositories/productRepository'); 
const { customersApi } = require('../utils/httpClient');

const idempotencyRepository = require('../repositories/idempotencyRepository'); 

class OrderService {
    constructor(repository) {
        this.repository = repository;
    }

    async createOrder({ customer_id, items }, idempotencyKey) {
        if (idempotencyKey) {
            const existingKey = await idempotencyRepository.findByKey(idempotencyKey);
            if(existingKey && existingKey.status === 'COMPLETED') {
                return existingKey.response_body;
            }
        }
            
        try {
            await customersApi.get(`/${customer_id}`);
        } catch (error) {
            if (error.response && error.response.status === 404) {
                throw new Error('CUSTOMER_NOT_FOUND');
            }
            console.error('Error validando cliente:', error.message);
            throw new Error('EXTERNAL_SERVICE_ERROR');
        }
        let total_cents = 0;
        for (const item of items) {
            const product = await productRepository.findById(item.product_id);
            if (!product) throw new Error(`PRODUCT_NOT_FOUND:${item.product_id}`);
            total_cents += product.price_cents * item.qty;
        }

        return await this.repository.createOrderWithTransaction({
            customer_id,
            total_cents,
            items
        });
    }

    async getOrder(id) {
        const order = await this.repository.findById(id);
        if (!order) throw new Error('ORDER_NOT_FOUND');
        return order;
    }

    async confirmOrder(orderId, idempotencyKey) {
        if (!idempotencyKey) {
            throw new Error('IDEMPOTENCY_KEY_REQUIRED');
        }
        const existingKey = await idempotencyRepository.findByKey(idempotencyKey);
        
        if (existingKey) {
            if (existingKey.status === 'PROCESSING') {
                throw new Error('REQUEST_IN_PROGRESS'); 
            }
            if (existingKey.status === 'COMPLETED') {
                return existingKey.response_body; 
            }
        }

        try {
            await idempotencyRepository.createKey(idempotencyKey, {
                target_type: 'ORDER',
                target_id: orderId
            });
        } catch (error) {
            throw new Error('REQUEST_IN_PROGRESS'); 
        }

        try {
            const order = await this.repository.findById(orderId);
            if (!order) throw new Error('ORDER_NOT_FOUND');
            
            if (order.status !== 'CREATED') {
                throw new Error('INVALID_ORDER_STATUS'); 
            }

            const confirmedOrder = await this.repository.updateStatus(orderId, 'CONFIRMED');
            await idempotencyRepository.markAsCompleted(idempotencyKey, confirmedOrder);

            return confirmedOrder;

        } catch (error) {
            await idempotencyRepository.deleteKey(idempotencyKey);
            throw error;
        }
    }

    async cancelOrder(id) {
        const order = await this.repository.findById(id); 
        if (!order) throw new Error('ORDER_NOT_FOUND');

        if (order.status === 'CANCELED') {
            throw new Error('ORDER_ALREADY_CANCELED');
        }

        if (order.status === 'CONFIRMED') {
            const createdAt = new Date(order.created_at);
            const now = new Date();
            const diffMinutes = (now - createdAt) / 60000; 

            if (diffMinutes > 10) {
                throw new Error('CANCELLATION_WINDOW_EXPIRED');
            }
        }

        return await this.repository.cancelOrderWithTransaction(id, order.items);
    }
}

module.exports = new OrderService(orderRepository);