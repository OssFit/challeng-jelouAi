// tests/unit/orderService.test.js

// 1. Definimos los mocks PRIMERO (inline) para evitar errores de referencia
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

// 2. Importamos el servicio y las dependencias (que ahora vendrán mockeadas)
const orderService = require('../../src/services/orderService'); // La instancia a probar
const mockOrderRepository = require('../../src/repositories/orderRepository'); // El mock para controlar
const mockIdempotencyRepository = require('../../src/repositories/idempotencyRepository'); // El mock para controlar

describe('OrderService - Idempotency Logic', () => {

    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('Debe retornar la respuesta guardada si la llave ya existe (COMPLETED)', async () => {
        // GIVEN: Una llave que ya fue completada exitosamente
        const savedResponse = { id: 1, status: 'CONFIRMED' };
        
        // Configuramos el comportamiento del mock importado
        mockIdempotencyRepository.findByKey.mockResolvedValue({
            status: 'COMPLETED',
            response_body: savedResponse
        });

        // WHEN: Intentamos confirmar
        const result = await orderService.confirmOrder(1, 'key-123');

        // THEN:
        expect(result).toEqual(savedResponse); // Debe devolver lo guardado
        expect(mockOrderRepository.updateStatus).not.toHaveBeenCalled(); // NO debe tocar la orden
        expect(mockIdempotencyRepository.createKey).not.toHaveBeenCalled(); // NO debe intentar crear llave
    });

    test('Debe fallar si hay un request en progreso (PROCESSING)', async () => {
        // GIVEN: Una llave en estado PROCESSING
        mockIdempotencyRepository.findByKey.mockResolvedValue({
            status: 'PROCESSING'
        });

        // WHEN / THEN:
        await expect(orderService.confirmOrder(1, 'key-123'))
            .rejects.toThrow('REQUEST_IN_PROGRESS');
    });

    test('Debe confirmar la orden si la llave es nueva', async () => {
        // GIVEN: No existe la llave
        mockIdempotencyRepository.findByKey.mockResolvedValue(null);
        
        // La orden existe y está en estado CREATED
        mockOrderRepository.findById.mockResolvedValue({ id: 1, status: 'CREATED' });
        
        // El update retorna la orden confirmada
        const confirmedOrder = { id: 1, status: 'CONFIRMED' };
        mockOrderRepository.updateStatus.mockResolvedValue(confirmedOrder);

        // WHEN
        const result = await orderService.confirmOrder(1, 'key-new');

        // THEN
        expect(mockIdempotencyRepository.createKey).toHaveBeenCalled(); // Crea el bloqueo
        expect(mockOrderRepository.updateStatus).toHaveBeenCalledWith(1, 'CONFIRMED'); // Ejecuta lógica
        expect(mockIdempotencyRepository.markAsCompleted).toHaveBeenCalled(); // Guarda resultado
        expect(result).toEqual(confirmedOrder);
    });
});