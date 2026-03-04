/// <reference types="vitest/globals" />
import '@testing-library/jest-dom';

// Mock next/server cookies and headers for API route tests
vi.mock('next/headers', () => ({
  cookies: vi.fn(() => ({
    get: vi.fn(),
    set: vi.fn(),
  })),
}));
