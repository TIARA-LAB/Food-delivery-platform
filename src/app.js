import express from 'express';
import cors from 'cors';

const app = express();

//Global Middlewares 
app.use(cors());
app.use(express.json());

// Health Check
app.get('/', (req, res) => {
 res.json({ message: 'Food Ordering API is running ' });
});

//404 Handler
app.use((req, res) => {
 res.status(404).json({ message: 'Route not found' });
});

//Global Error Handler 
app.use((err, req, res, next) => {
 console.error(err);
 const statusCode = err.statusCode || 500;
 res.status(statusCode).json({
  message: err.message || 'Internal server error',
 });
});

export default app;
