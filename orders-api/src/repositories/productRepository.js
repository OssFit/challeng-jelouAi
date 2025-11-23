const db = require('../config/db');

class ProductRepository {
    constructor(database) {
        this.db = database;
    }

    async create({ sku, name, price_cents, stock }) {
        const [result] = await this.db.execute(
            'INSERT INTO products (sku, name, price_cents, stock) VALUES (?, ?, ?, ?)',
            [sku, name, price_cents, stock]
        );
        return { id: result.insertId, sku, name, price_cents, stock };
    }

    async findById(id) {
        const [rows] = await this.db.execute('SELECT * FROM products WHERE id = ?', [id]);
        return rows[0] || null;
    }

    async findBySku(sku) {
        const [rows] = await this.db.execute('SELECT * FROM products WHERE sku = ?', [sku]);
        return rows[0] || null;
    }

    async update(id, { name, price_cents, stock }) {
        let fields = [];
        let params = [];

        if (name !== undefined) {
            fields.push('name = ?');
            params.push(name);
        }
        if (price_cents !== undefined) {
            fields.push('price_cents = ?');
            params.push(price_cents);
        }
        if (stock !== undefined) {
            fields.push('stock = ?');
            params.push(stock);
        }

        if (fields.length === 0) return null;

        params.push(id);

        await this.db.execute(
            `UPDATE products SET ${fields.join(', ')} WHERE id = ?`,
            params
        );
        
        return this.findById(id);
    }

    async findAll({ search, limit, cursor }) {
        let query = 'SELECT * FROM products';
        let params = [];
        let conditions = [];

        if (search) {
            conditions.push('(name LIKE ? OR sku LIKE ?)');
            params.push(`%${search}%`, `%${search}%`);
        }

        if (cursor) {
            conditions.push('id > ?');
            params.push(parseInt(cursor));
        }

        if (conditions.length > 0) {
            query += ' WHERE ' + conditions.join(' AND ');
        }

        query += ' ORDER BY id ASC LIMIT ?';
        params.push(parseInt(limit));

        const [rows] = await this.db.query(query, params);
        return rows;
    }
}

module.exports = new ProductRepository(db);