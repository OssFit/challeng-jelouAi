const db = require('../config/db');

class CustomerRepository {
    constructor(database) {
        this.db = database;
    }

    async create({ name, email, phone }) {
        const [result] = await this.db.execute(
            'INSERT INTO customers (name, email, phone) VALUES (?, ?, ?)',
            [name, email, phone]
        );
        return { id: result.insertId, name, email, phone };
    }

    async findByEmail(email) {
        const [rows] = await this.db.execute(
            'SELECT * FROM customers WHERE email = ?', 
            [email]
        );
        return rows[0] || null;
    }

    async findById(id) {
        const [rows] = await this.db.execute(
            'SELECT * FROM customers WHERE id = ?', 
            [id]
        );
        return rows[0] || null;
    }

    async findAll({ search, limit, cursor }) {
        let query = 'SELECT * FROM customers';
        let params = [];
        let conditions = [];

        if (search) {
            conditions.push('(name LIKE ? OR email LIKE ?)');
            params.push(`%${search}%`, `%${search}%`);
        }

        if (cursor) {
            conditions.push('id > ?');
            params.push(parseInt(cursor));
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

        console.log('🔍 Cursor Query:', query, params); // Debug

        const [rows] = await this.db.query(query, params);
        return rows;
    }

    async update(id, { name, email, phone }) {
        await this.db.execute(
            'UPDATE customers SET name = ?, email = ?, phone = ? WHERE id = ?',
            [name, email, phone, id]
        );
        return { id, name, email, phone };
    }

    async delete(id) {
        const [result] = await this.db.execute('DELETE FROM customers WHERE id = ?', [id]);
        return result.affectedRows > 0;
    }
}

module.exports = new CustomerRepository(db);