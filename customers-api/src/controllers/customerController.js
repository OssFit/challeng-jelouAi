const { z } = require('zod');
const customerService = require('../services/customerService');

const createCustomerSchema = z.object({
    name: z.string().min(1, "Name is required"),
    email: z.string().email("Invalid email format"),
    phone: z.string().optional()
});

class CustomerController {
    constructor(service) {
        this.service = service;
    }

    create = async (req, res) => {
        try {
            const validatedData = createCustomerSchema.parse(req.body);

            const newCustomer = await this.service.createCustomer(validatedData);

            res.status(201).json(newCustomer);

        } catch (error) {
            this.handleError(res, error);
        }
    };

    getOne = async (req, res) => {
        try {
            const { id } = req.params;
            const customer = await this.service.getCustomerById(id);
            res.json(customer);
        } catch (error) {
            this.handleError(res, error);
        }
    };

    search = async (req, res) => {
        try {
            const { search, limit, cursor } = req.query;
            
            const result = await this.service.listCustomers({ search, limit, cursor });
            res.json(result);
        } catch (error) {
            this.handleError(res, error);
        }
    };

    handleError(res, error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ error: 'Validation Error', details: error.errors });
        }
        if (error.message === 'EMAIL_ALREADY_EXISTS') {
            return res.status(409).json({ error: 'Email already registered' });
        }
        if (error.message === 'CUSTOMER_NOT_FOUND') {
            return res.status(404).json({ error: 'Customer not found' });
        }
        
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }

    update = async (req, res) => {
        try {
            const { id } = req.params;
            const validatedData = createCustomerSchema.parse(req.body); 
            
            const updatedCustomer = await this.service.updateCustomer(id, validatedData);
            res.json(updatedCustomer);
        } catch (error) {
            this.handleError(res, error);
        }
    };

    delete = async (req, res) => {
        try {
            const { id } = req.params;
            await this.service.deleteCustomer(id);
            res.status(204).send(); 
        } catch (error) {
            this.handleError(res, error);
        }
    };
}

module.exports = new CustomerController(customerService);