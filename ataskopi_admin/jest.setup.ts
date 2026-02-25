import '@testing-library/jest-dom';

// Mock environment variables for testing
process.env.SUPABASE_JWT_SECRET = 'test-jwt-secret-key-for-testing-only';
process.env.POSTGRES_PRISMA_URL = 'postgresql://test:test@localhost:5432/test';
process.env.POSTGRES_URL_NON_POOLING = 'postgresql://test:test@localhost:5432/test';
