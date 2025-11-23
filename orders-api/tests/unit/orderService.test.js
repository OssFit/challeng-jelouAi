jest.mock('../../src/config/envs', () => ({
    DB_HOST: 'localhost',
    DB_USER: 'test',
    DB_PASSWORD: 'test',
    DB_NAME: 'test_db',
    CUSTOMERS_API_URL: 'http://localhost:3001',
    SERVICE_TOKEN: 'test-token',
    JWT_SECRET: 'test-secret'
}));
jest.mock('../../src/repositories/orderRepository', () => ({
    findById: jest.fn(),
    updateStatus: jest.fn(),
    createOrderWithTransaction: jest.fn()
}));

jest.mock('../../src/repositories/idempotencyRepository', () => ({
    findByKey: jest.fn(),
    createKey: jest.fn(),
    markAsCompleted: jest.fn(),
    deleteKey: jest.fn()
}));

jest.mock('../../src/utils/httpClient', () => ({
    customersApi: { get: jest.fn() }
}));

const orderService = require('../../src/services/orderService');
const mockOrderRepository = require('../../src/repositories/orderRepository');
const mockIdempotencyRepository = require('../../src/repositories/idempotencyRepository');

describe('OrderService - Idempotency Logic', () => {

    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('Debe retornar la respuesta guardada si la llave ya existe (COMPLETED)', async () => {
        const savedResponse = { id: 1, status: 'CONFIRMED' };
        
        mockIdempotencyRepository.findByKey.mockResolvedValue({
            status: 'COMPLETED',
            response_body: savedResponse
        });

        const result = await orderService.confirmOrder(1, 'key-123');

        expect(result).toEqual(savedResponse);
        expect(mockOrderRepository.updateStatus).not.toHaveBeenCalled();
        expect(mockIdempotencyRepository.createKey).not.toHaveBeenCalled();
    });

    test('Debe fallar si hay un request en progreso (PROCESSING)', async () => {
        mockIdempotencyRepository.findByKey.mockResolvedValue({
            status: 'PROCESSING'
        });

        await expect(orderService.confirmOrder(1, 'key-123'))
            .rejects.toThrow('REQUEST_IN_PROGRESS');
    });

    test('Debe confirmar la orden si la llave es nueva', async () => {
        mockIdempotencyRepository.findByKey.mockResolvedValue(null);
        mockIdempotencyRepository.findByKey.mockResolvedValue(null);
        
        mockOrderRepository.findById.mockResolvedValue({ id: 1, status: 'CREATED' });
        
        const confirmedOrder = { id: 1, status: 'CONFIRMED' };
        mockOrderRepository.updateStatus.mockResolvedValue(confirmedOrder);

        const result = await orderService.confirmOrder(1, 'key-new');

        expect(mockIdempotencyRepository.createKey).toHaveBeenCalled();
        expect(mockOrderRepository.updateStatus).toHaveBeenCalledWith(1, 'CONFIRMED');
        expect(mockIdempotencyRepository.markAsCompleted).toHaveBeenCalled();
        expect(result).toEqual(confirmedOrder);
    });
});