
const customerRepository = require('../repositories/customerRepository');

class CustomerService {
    constructor(repository) {
        this.repository = repository;
    }

    async createCustomer(data) {
        const existingCustomer = await this.repository.findByEmail(data.email);
        if (existingCustomer) {
            throw new Error('EMAIL_ALREADY_EXISTS');
        }

        return await this.repository.create(data);
    }

    async getCustomerById(id) {
        const customer = await this.repository.findById(id);
        if (!customer) {
            throw new Error('CUSTOMER_NOT_FOUND');
        }
        return customer;
    }

    async listCustomers({ search, limit, cursor }) {
        const limitParsed = parseInt(limit) || 10;
        
        const customers = await this.repository.findAll({ 
            search, 
            limit: limitParsed, 
            cursor 
        });

        let nextCursor = null;
        if (customers.length > 0) {
            nextCursor = customers[customers.length - 1].id;
        }

        return {
            data: customers,
            pagination: {
                nextCursor, 
                limit: limitParsed
            }
        };
    }

    async updateCustomer(id, data) {
        const customer = await this.repository.findById(id);
        if (!customer) {
            throw new Error('CUSTOMER_NOT_FOUND');
        }

        if (data.email && data.email !== customer.email) {
            const existing = await this.repository.findByEmail(data.email);
            if (existing) {
                throw new Error('EMAIL_ALREADY_EXISTS');
            }
        }

        return await this.repository.update(id, data);
    }

    async deleteCustomer(id) {
        const customer = await this.repository.findById(id);
        if (!customer) {
            throw new Error('CUSTOMER_NOT_FOUND');
        }
        return await this.repository.delete(id);
    }
}

module.exports = new CustomerService(customerRepository);