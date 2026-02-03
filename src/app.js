import express from 'express';
import cors from 'cors';
import { config } from './config/index.js';
import { logInfo } from './utils/logger.js';
import authRoutes from './routes/authRoutes.js';
import { handleError } from './utils/error.js';
import helmet from 'helmet';

const app = express();

// Security middleware
app.use(helmet());
app.use(cors(config.cors));

// Body parsing
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    environment: config.nodeEnv
  });
});

// Routes 
app.use('/api/auth', authRoutes);

app.use((req, res, next) => {
  const err = new Error(`Route ${req.originalUrl} not found`);
  err.statusCode = 404;
  err.isOperational = true;
  next(err);
});

// Global error handler 
app.use(handleError);

const port = config.port || 3000;
logInfo(`Server starting on port ${port}`);

export default app;
