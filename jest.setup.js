// Learn more: https://github.com/testing-library/jest-dom
import "@testing-library/jest-dom"

// Mock environment variables for testing
process.env.JWT_SECRET = "test-secret-key-for-jwt-testing"
process.env.JWT_EXPIRATION = "1h"
process.env.REFRESH_TOKEN_EXPIRATION = "7d"
process.env.DATABASE_URL = "postgresql://test:test@localhost:5432/test"
