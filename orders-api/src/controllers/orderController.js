const { z } = require('zod');
const orderService = require('../services/orderService');

const createOrderSchema = z.object({
    customer_id: z.number().int().positive(),
    items: z.array(z.object({
        product_id: z.number().int().positive(),
        qty: z.number().int().positive()
    })).min(1, "La orden debe tener al menos un producto")
});

class OrderController {
    constructor(service) {
        this.service = service;
    }

    create = async (req, res) => {
        try {
            const validated = createOrderSchema.parse(req.body);
            const idempotencyKey = req.headers['x-idempotency-key'];
            const order = await this.service.createOrder(validated, idempotencyKey);
            res.status(201).json(order);
        } catch (error) {
            this.handleError(res, error);
        }
    };

    list = async (req, res) => {
        try {
            const { status, from, to, cursor, limit } = req.query;
            const result = await this.service.listOrders({ status, from, to, cursor, limit });
            res.json(result);
        } catch (error) {
            this.handleError(res, error);
        }
    };

    getOne = async (req, res) => {
        try {
            const { id } = req.params;
            const order = await this.service.getOrder(id);
            res.json(order);
        } catch (error) {
            this.handleError(res, error);
        }
    };

    confirm = async (req, res) => {
        try {
            const { id } = req.params;
            const idempotencyKey = req.headers['x-idempotency-key'];

            const result = await this.service.confirmOrder(id, idempotencyKey);
            res.json(result);
        } catch (error) {
            this.handleError(res, error);
        }
    };

    cancel = async (req, res) => {
        try {
            const { id } = req.params;
            const result = await this.service.cancelOrder(id);
            res.json(result);
        } catch (error) {
            this.handleError(res, error);
        }
    };

    handleError(res, error) {
        if (error instanceof z.ZodError) return res.status(400).json({ error: error.errors });
        
        if (error.message === 'CUSTOMER_NOT_FOUND') return res.status(404).json({ error: 'El cliente no existe (validado externamente)' });
        if (error.message === 'EXTERNAL_SERVICE_ERROR') return res.status(502).json({ error: 'Fallo en comunicación con Customers API' });
        if (error.message === 'ORDER_NOT_FOUND') return res.status(404).json({ error: 'Orden no encontrada' });
        
        if (error.message.startsWith('INSUFFICIENT_STOCK')) {
            const id = error.message.split(':')[1];
            return res.status(409).json({ error: `Stock insuficiente para el producto ID ${id}` });
        }

        if (error.message === 'IDEMPOTENCY_KEY_REQUIRED') return res.status(400).json({ error: 'Header X-Idempotency-Key is required' });
        if (error.message === 'INVALID_ORDER_STATUS') return res.status(400).json({ error: 'Order cannot be confirmed' });
        if (error.message === 'REQUEST_IN_PROGRESS') return res.status(409).json({ error: 'Request in progress' });

        if (error.message === 'ORDER_ALREADY_CANCELED') return res.status(409).json({ error: 'Order is already canceled' });
        if (error.message === 'CANCELLATION_WINDOW_EXPIRED') return res.status(403).json({ error: 'Cancellation period expired (10 mins limit)' });

        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}

module.exports = new OrderController(orderService);