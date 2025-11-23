const db = require('../config/db');

class IdempotencyRepository {
    constructor(database) {
        this.db = database;
    }

    async findByKey(key) {
        const [rows] = await this.db.execute(
            'SELECT * FROM idempotency_keys WHERE key_id = ?', 
            [key]
        );
        return rows[0] || null;
    }

    async createKey(key, { target_type, target_id }) {
        await this.db.execute(
            'INSERT INTO idempotency_keys (key_id, target_type, target_id, status) VALUES (?, ?, ?, ?)',
            [key, target_type, target_id, 'PROCESSING']
        );
    }

    async markAsCompleted(key, responseBody) {
        await this.db.execute(
            'UPDATE idempotency_keys SET status = ?, response_body = ? WHERE key_id = ?',
            ['COMPLETED', JSON.stringify(responseBody), key]
        );
    }

    async deleteKey(key) {
        await this.db.execute('DELETE FROM idempotency_keys WHERE key_id = ?', [key]);
    }
}

module.exports = new IdempotencyRepository(db);