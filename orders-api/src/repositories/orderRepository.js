const db = require('../config/db');

class OrderRepository {
    constructor(database) {
        this.db = database;
    }

    async createOrderWithTransaction({ customer_id, total_cents, items }) {
        const connection = await this.db.getConnection();
        
        try {
            await connection.beginTransaction();

            const [orderResult] = await connection.execute(
                'INSERT INTO orders (customer_id, total_cents, status) VALUES (?, ?, ?)',
                [customer_id, total_cents, 'CREATED']
            );
            const orderId = orderResult.insertId;

            for (const item of items) {
                const [products] = await connection.execute(
                    'SELECT price_cents, stock FROM products WHERE id = ? FOR UPDATE',
                    [item.product_id]
                );

                if (products.length === 0) {
                    throw new Error(`PRODUCT_NOT_FOUND:${item.product_id}`);
                }

                const product = products[0];

                if (product.stock < item.qty) {
                    throw new Error(`INSUFFICIENT_STOCK:${item.product_id}`);
                }
                await connection.execute(
                    'UPDATE products SET stock = stock - ? WHERE id = ?',
                    [item.qty, item.product_id]
                );

                    await connection.execute(
                    'INSERT INTO order_items (order_id, product_id, qty, unit_price_cents, subtotal_cents) VALUES (?, ?, ?, ?, ?)',
                    [orderId, item.product_id, item.qty, product.price_cents, product.price_cents * item.qty]
                );
            }

            await connection.commit();
            return { id: orderId, status: 'CREATED', total_cents };

        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    async findById(id) {
        const [orders] = await this.db.execute('SELECT * FROM orders WHERE id = ?', [id]);
        if (orders.length === 0) return null;

        const order = orders[0];
        
        const [items] = await this.db.execute(
            'SELECT product_id, qty, unit_price_cents, subtotal_cents FROM order_items WHERE order_id = ?', 
            [id]
        );
        
        order.items = items;
        return order;
    }

    async updateStatus(id, status) {
        await this.db.execute(
            'UPDATE orders SET status = ? WHERE id = ?',
            [status, id]
        );
        return this.findById(id);
    }

    async cancelOrderWithTransaction(orderId, items) {
        const connection = await this.db.getConnection();
        
        try {
            await connection.beginTransaction();

            await connection.execute(
                'UPDATE orders SET status = ? WHERE id = ?',
                ['CANCELED', orderId]
            );

            for (const item of items) {
                await connection.execute(
                    'UPDATE products SET stock = stock + ? WHERE id = ?',
                    [item.qty, item.product_id]
                );
            }

            await connection.commit();
            return { id: orderId, status: 'CANCELED' };

        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }
}

module.exports = new OrderRepository(db);