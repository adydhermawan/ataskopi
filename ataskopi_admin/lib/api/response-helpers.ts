import { NextResponse } from 'next/server';
import { z } from 'zod';

/**
 * Standard success response format
 */
export function successResponse<T>(data: T, status: number = 200): NextResponse {
    return NextResponse.json(
        {
            success: true,
            data,
        },
        { status }
    );
}

/**
 * Standard error response format
 */
export function errorResponse(message: string, status: number = 400): NextResponse {
    return NextResponse.json(
        {
            success: false,
            error: message,
        },
        { status }
    );
}

/**
 * Bad request error response (400)
 */
export function badRequestResponse(message: string = 'Bad request'): NextResponse {
    return errorResponse(message, 400);
}

/**
 * Validation error response with detailed field errors
 */
export function validationErrorResponse(errors: z.ZodError): NextResponse {
    const fieldErrors = ((errors as any).errors || []).map((err: any) => ({
        field: err.path.join('.'),
        message: err.message,
    }));

    return NextResponse.json(
        {
            success: false,
            error: 'Validation failed',
            details: fieldErrors,
        },
        { status: 422 }
    );
}

/**
 * Not found error response
 */
export function notFoundResponse(resource: string = 'Resource'): NextResponse {
    return NextResponse.json(
        {
            success: false,
            error: `${resource} not found`,
        },
        { status: 404 }
    );
}

/**
 * Unauthorized error response
 */
export function unauthorizedResponse(message: string = 'Unauthorized'): NextResponse {
    return NextResponse.json(
        {
            success: false,
            error: message,
        },
        { status: 401 }
    );
}

/**
 * Forbidden error response
 */
export function forbiddenResponse(message: string = 'Forbidden'): NextResponse {
    return NextResponse.json(
        {
            success: false,
            error: message,
        },
        { status: 403 }
    );
}

/**
 * Internal server error response
 */
export function serverErrorResponse(message: string = 'Internal server error'): NextResponse {
    return NextResponse.json(
        {
            success: false,
            error: message,
        },
        { status: 500 }
    );
}

/**
 * Paginated response format
 */
export function paginatedResponse<T>(
    data: T[],
    total: number,
    limit: number,
    offset: number
): NextResponse {
    return NextResponse.json(
        {
            success: true,
            data,
            pagination: {
                total,
                limit,
                offset,
                hasMore: offset + limit < total,
            },
        },
        { status: 200 }
    );
}
