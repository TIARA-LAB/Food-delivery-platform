import express from 'express';
import cors from 'cors';
import prisma from './config/db.js'

const app = express();

//Global Middlewares
app.use(cors());
app.use(express.json());

//Health Check / DB Test
app.get('/', async (req, res) => {
 try {
  // Simple query to check MySQL connection
  const result = await prisma.$queryRaw`SELECT NOW() AS server_time;`;
  res.json({
   message: 'Food Ordering API is running',
   mysqlServerTime: result[0].server_time,
  });
 } catch (err) {
  console.error('DB connection failed:', err);
  res.status(500).json({
   message: 'DB connection failed',
   error: err.message,
  });
 }
});

// 404 Handler
app.use((req, res) => {
 res.status(404).json({ message: 'Route not found' });
});

// Global Error Handler
app.use((err, req, res, next) => {
 console.error(err);
 const statusCode = err.statusCode || 500;
 res.status(statusCode).json({
  message: err.message || 'Internal server error',
 });
});

export default app;
