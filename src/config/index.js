import dotenv from 'dotenv';

dotenv.config();

export const config = {
 // Server configuration
 port: parseInt(process.env.PORT) || 3000,
 nodeEnv: process.env.NODE_ENV || 'development',

 // Database configuration
 database: {
  url: process.env.DATABASE_URL,
 },

 // JWT configuration
 jwt: {
  accessSecret: process.env.JWT_ACCESS_SECRET,
  refreshSecret: process.env.JWT_REFRESH_SECRET,
  accessExpiry: process.env.JWT_ACCESS_EXPIRY || '15m',
  refreshExpiry: process.env.JWT_REFRESH_EXPIRY || '7d',
  verifySecret: process.env.JWT_VERIFY_SECRET,
 },

 // Email configuration
 RESEND_API_KEY: process.env.RESEND_API_KEY,
 //FROM_EMAIL: process.env.FROM_EMAIL,
 FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:3000',

 // CORS configuration
 cors: {
  origin: process.env.CORS_ORIGIN?.split(',') || [
   'http://localhost:3000',
   'http://localhost:3001'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
 },

 // Rate limiting configuration
 rateLimit: {
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
 },
};

// Validate critical environment variables
const requiredEnvVars = [
 'DATABASE_URL',
 'JWT_ACCESS_SECRET',
 'JWT_REFRESH_SECRET',
 'RESEND_API_KEY',
 'FROM_EMAIL'
];

const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
if (missingVars.length > 0) {
 console.error('Missing required environment variables:', missingVars);
 process.exit(1);
}

console.log(`Config loaded for ${config.nodeEnv} environment`);
