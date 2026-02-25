import {
    successResponse,
    errorResponse,
    validationErrorResponse,
    paginatedResponse,
    notFoundResponse,
    serverErrorResponse,
} from '@/lib/api/response-helpers';
import { z } from 'zod';

describe('Response Helpers', () => {
    describe('successResponse', () => {
        it('should return success response with data', async () => {
            const data = { id: '123', name: 'Test' };
            const response = successResponse(data);
            const json = await response.json();

            expect(response.status).toBe(200);
            expect(json).toEqual({
                success: true,
                data,
            });
        });

        it('should return success response with custom status', async () => {
            const data = { id: '123' };
            const response = successResponse(data, 201);
            const json = await response.json();

            expect(response.status).toBe(201);
            expect(json.success).toBe(true);
        });
    });

    describe('errorResponse', () => {
        it('should return error response with message', async () => {
            const message = 'Something went wrong';
            const response = errorResponse(message);
            const json = await response.json();

            expect(response.status).toBe(400);
            expect(json).toEqual({
                success: false,
                error: message,
            });
        });

        it('should return error response with custom status', async () => {
            const message = 'Forbidden';
            const response = errorResponse(message, 403);
            const json = await response.json();

            expect(response.status).toBe(403);
            expect(json.success).toBe(false);
        });
    });

    describe('validationErrorResponse', () => {
        it('should return validation error with field details', async () => {
            const schema = z.object({
                name: z.string().min(3),
                email: z.string().email(),
            });

            const result = schema.safeParse({ name: 'Jo', email: 'invalid' });

            if (!result.success) {
                const response = validationErrorResponse(result.error);
                const json = await response.json();

                expect(response.status).toBe(422);
                expect(json.success).toBe(false);
                expect(json.error).toBe('Validation failed');
                expect(json.details).toBeDefined();
                expect(Array.isArray(json.details)).toBe(true);
            }
        });
    });

    describe('paginatedResponse', () => {
        it('should return paginated response', async () => {
            const data = [{ id: '1' }, { id: '2' }];
            const total = 10;
            const limit = 2;
            const offset = 0;

            const response = paginatedResponse(data, total, limit, offset);
            const json = await response.json();

            expect(response.status).toBe(200);
            expect(json).toEqual({
                success: true,
                data,
                pagination: {
                    total,
                    limit,
                    offset,
                    hasMore: true,
                },
            });
        });

        it('should indicate no more results when at end', async () => {
            const data = [{ id: '9' }, { id: '10' }];
            const total = 10;
            const limit = 2;
            const offset = 8;

            const response = paginatedResponse(data, total, limit, offset);
            const json = await response.json();

            expect(json.pagination.hasMore).toBe(false);
        });
    });

    describe('notFoundResponse', () => {
        it('should return 404 response', async () => {
            const message = 'Resource not found';
            const response = notFoundResponse(message);
            const json = await response.json();

            expect(response.status).toBe(404);
            expect(json).toEqual({
                success: false,
                error: message,
            });
        });
    });

    describe('serverErrorResponse', () => {
        it('should return 500 response', async () => {
            const message = 'Internal server error';
            const response = serverErrorResponse(message);
            const json = await response.json();

            expect(response.status).toBe(500);
            expect(json).toEqual({
                success: false,
                error: message,
            });
        });
    });
});
