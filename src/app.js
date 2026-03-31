import express from 'express';
import cors from 'cors';
import { config } from './config/index.js';
import { logInfo } from './utils/logger.js';
import authRoutes from './routes/authRoutes.js';
import vendorRoutes from './routes/vendorRoutes.js';
import customerRoutes from './routes/customerRoutes.js';
import productRoutes from './routes/productRoutes.js';

import walletRoutes from './routes/walletRoutes.js'

import adminRoutes from './routes/adminRoutes.js';

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
app.use('/api/vendor', vendorRoutes);
app.use('/api/customer', customerRoutes);
app.use('/api/products', productRoutes);

app.use('/api/wallet',walletRoutes)

app.use('/api/admin',adminRoutes)


// 404 handler
app.use((req, res, next) => {
  const err = new Error(`Route ${req.originalUrl} not found`);
  err.statusCode = 404;
  err.isOperational = true;
  next(err);
});


//  GLOBAL ERROR HANDLER - LAST (use handleError)


app.use(handleError);  
const port = config.port || 3000;
logInfo(`Server starting on port ${port}`);

export default app;
