/**
 * Business rule failure that is safe to show to the caller.
 */
export class ServiceError extends Error {
    constructor(message: string, public status: number = 400) {
        super(message);
        this.name = 'ServiceError';
    }
}
