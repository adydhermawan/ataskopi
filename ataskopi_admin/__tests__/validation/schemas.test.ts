import { z } from 'zod';
import {
    createOrderSchema,
    updateProfileSchema,
    productQuerySchema,
    orderQuerySchema,
    voucherQuerySchema,
} from '@/lib/validation/order-schemas';

describe('Validation Schemas', () => {
    describe('createOrderSchema', () => {
        it('should validate a valid dine-in order', () => {
            const validOrder = {
                outletId: '123e4567-e89b-12d3-a456-426614174000',
                orderType: 'dine_in' as const,
                tableId: '123e4567-e89b-12d3-a456-426614174001',
                items: [
                    {
                        productId: '123e4567-e89b-12d3-a456-426614174002',
                        quantity: 2,
                    },
                ],
                paymentMethod: 'qris' as const,
            };

            const result = createOrderSchema.safeParse(validOrder);
            expect(result.success).toBe(true);
        });

        it('should fail when dine-in order missing tableId', () => {
            const invalidOrder = {
                outletId: '123e4567-e89b-12d3-a456-426614174000',
                orderType: 'dine_in' as const,
                items: [
                    {
                        productId: '123e4567-e89b-12d3-a456-426614174002',
                        quantity: 2,
                    },
                ],
                paymentMethod: 'qris' as const,
            };

            const result = createOrderSchema.safeParse(invalidOrder);
            expect(result.success).toBe(false);
        });

        it('should validate pickup order with scheduledTime', () => {
            const validOrder = {
                outletId: '123e4567-e89b-12d3-a456-426614174000',
                orderType: 'pickup' as const,
                scheduledTime: '2026-01-22T10:30:00Z',
                items: [
                    {
                        productId: '123e4567-e89b-12d3-a456-426614174002',
                        quantity: 1,
                    },
                ],
                paymentMethod: 'cash' as const,
            };

            const result = createOrderSchema.safeParse(validOrder);
            expect(result.success).toBe(true);
        });

        it('should fail when pickup order missing scheduledTime', () => {
            const invalidOrder = {
                outletId: '123e4567-e89b-12d3-a456-426614174000',
                orderType: 'pickup' as const,
                items: [
                    {
                        productId: '123e4567-e89b-12d3-a456-426614174002',
                        quantity: 1,
                    },
                ],
                paymentMethod: 'cash' as const,
            };

            const result = createOrderSchema.safeParse(invalidOrder);
            expect(result.success).toBe(false);
        });

        it('should validate delivery order with deliveryAddress', () => {
            const validOrder = {
                outletId: '123e4567-e89b-12d3-a456-426614174000',
                orderType: 'delivery' as const,
                deliveryAddress: {
                    latitude: -6.2,
                    longitude: 106.8,
                    address: 'Jl. Sudirman No. 123',
                },
                items: [
                    {
                        productId: '123e4567-e89b-12d3-a456-426614174002',
                        quantity: 1,
                    },
                ],
                paymentMethod: 'qris' as const,
            };

            const result = createOrderSchema.safeParse(validOrder);
            expect(result.success).toBe(true);
        });

        it('should validate order with options and modifiers', () => {
            const validOrder = {
                outletId: '123e4567-e89b-12d3-a456-426614174000',
                orderType: 'dine_in' as const,
                tableId: '123e4567-e89b-12d3-a456-426614174001',
                items: [
                    {
                        productId: '123e4567-e89b-12d3-a456-426614174002',
                        quantity: 1,
                        selectedOptions: [
                            {
                                optionId: '123e4567-e89b-12d3-a456-426614174003',
                                valueId: '123e4567-e89b-12d3-a456-426614174004',
                            },
                        ],
                        selectedModifiers: [
                            {
                                modifierId: '123e4567-e89b-12d3-a456-426614174005',
                                quantity: 2,
                            },
                        ],
                        notes: 'Extra hot',
                    },
                ],
                paymentMethod: 'qris' as const,
            };

            const result = createOrderSchema.safeParse(validOrder);
            expect(result.success).toBe(true);
        });

        it('should validate order with voucher and points', () => {
            const validOrder = {
                outletId: '123e4567-e89b-12d3-a456-426614174000',
                orderType: 'dine_in' as const,
                tableId: '123e4567-e89b-12d3-a456-426614174001',
                items: [
                    {
                        productId: '123e4567-e89b-12d3-a456-426614174002',
                        quantity: 1,
                    },
                ],
                paymentMethod: 'qris' as const,
                voucherCode: 'WELCOME10',
                pointsToRedeem: 100,
            };

            const result = createOrderSchema.safeParse(validOrder);
            expect(result.success).toBe(true);
        });

        it('should fail with invalid UUID', () => {
            const invalidOrder = {
                outletId: 'not-a-uuid',
                orderType: 'dine_in' as const,
                tableId: '123e4567-e89b-12d3-a456-426614174001',
                items: [
                    {
                        productId: '123e4567-e89b-12d3-a456-426614174002',
                        quantity: 1,
                    },
                ],
                paymentMethod: 'qris' as const,
            };

            const result = createOrderSchema.safeParse(invalidOrder);
            expect(result.success).toBe(false);
        });

        it('should fail with empty items array', () => {
            const invalidOrder = {
                outletId: '123e4567-e89b-12d3-a456-426614174000',
                orderType: 'dine_in' as const,
                tableId: '123e4567-e89b-12d3-a456-426614174001',
                items: [],
                paymentMethod: 'qris' as const,
            };

            const result = createOrderSchema.safeParse(invalidOrder);
            expect(result.success).toBe(false);
        });

        it('should fail with negative quantity', () => {
            const invalidOrder = {
                outletId: '123e4567-e89b-12d3-a456-426614174000',
                orderType: 'dine_in' as const,
                tableId: '123e4567-e89b-12d3-a456-426614174001',
                items: [
                    {
                        productId: '123e4567-e89b-12d3-a456-426614174002',
                        quantity: -1,
                    },
                ],
                paymentMethod: 'qris' as const,
            };

            const result = createOrderSchema.safeParse(invalidOrder);
            expect(result.success).toBe(false);
        });
    });

    describe('updateProfileSchema', () => {
        it('should validate valid profile update', () => {
            const validUpdate = {
                name: 'John Doe',
                email: 'john@example.com',
            };

            const result = updateProfileSchema.safeParse(validUpdate);
            expect(result.success).toBe(true);
        });

        it('should fail with name too short', () => {
            const invalidUpdate = {
                name: 'Jo',
                email: 'john@example.com',
            };

            const result = updateProfileSchema.safeParse(invalidUpdate);
            expect(result.success).toBe(false);
        });

        it('should fail with invalid email', () => {
            const invalidUpdate = {
                name: 'John Doe',
                email: 'not-an-email',
            };

            const result = updateProfileSchema.safeParse(invalidUpdate);
            expect(result.success).toBe(false);
        });

        it('should allow updating only name', () => {
            const validUpdate = {
                name: 'John Doe',
            };

            const result = updateProfileSchema.safeParse(validUpdate);
            expect(result.success).toBe(true);
        });

        it('should fail when updating only email without name', () => {
            const invalidUpdate = {
                email: 'john@example.com',
            };

            const result = updateProfileSchema.safeParse(invalidUpdate);
            expect(result.success).toBe(false); // name is required
        });
    });

    describe('productQuerySchema', () => {
        it('should validate valid product query', () => {
            const validQuery = {
                categoryId: '123e4567-e89b-12d3-a456-426614174000',
                search: 'coffee',
                recommended: 'true',
                available: 'true',
            };

            const result = productQuerySchema.safeParse(validQuery);
            expect(result.success).toBe(true);
        });

        it('should allow empty query', () => {
            const emptyQuery = {};

            const result = productQuerySchema.safeParse(emptyQuery);
            expect(result.success).toBe(true);
        });

        it('should validate category filter', () => {
            const validQuery = {
                category: 'coffee', // category is a string, not UUID
            };

            const result = productQuerySchema.safeParse(validQuery);
            expect(result.success).toBe(true);
        });
    });

    describe('orderQuerySchema', () => {
        it('should validate active status filter', () => {
            const validQuery = {
                status: 'active',
                limit: '20',
                offset: '0',
            };

            const result = orderQuerySchema.safeParse(validQuery);
            expect(result.success).toBe(true);
        });

        it('should validate completed status filter', () => {
            const validQuery = {
                status: 'completed',
            };

            const result = orderQuerySchema.safeParse(validQuery);
            expect(result.success).toBe(true);
        });

        it('should fail with invalid status', () => {
            const invalidQuery = {
                status: 'invalid',
            };

            const result = orderQuerySchema.safeParse(invalidQuery);
            expect(result.success).toBe(false);
        });
    });

    describe('voucherQuerySchema', () => {
        it('should validate available filter', () => {
            const validQuery = {
                filter: 'available' as const, // field is 'filter', not 'status'
            };

            const result = voucherQuerySchema.safeParse(validQuery);
            expect(result.success).toBe(true);
        });

        it('should validate all filter', () => {
            const validQuery = {
                filter: 'all' as const,
            };

            const result = voucherQuerySchema.safeParse(validQuery);
            expect(result.success).toBe(true);
        });

        it('should allow empty query', () => {
            const emptyQuery = {};

            const result = voucherQuerySchema.safeParse(emptyQuery);
            expect(result.success).toBe(true);
        });
    });
});
