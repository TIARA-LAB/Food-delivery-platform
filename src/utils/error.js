export class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

export const handleError = (err, req, res, next) => {
  console.error('GLOBAL ERROR HANDLER FIRED:');
  console.error('Path:', req.path);
  console.error('Method:', req.method);
  console.error(' User:', req.user?.id);
  console.error(' Body:', req.body);
  console.error(' Error:', err.message);
  console.error('Stack:', err.stack);

  // AppError handling
  if (err.name === 'AppError' || err.statusCode) {
    return res.status(err.statusCode).json({
      status: err.status || 'error',
      message: err.message
    });
  }

  // Prisma/DB errors
  if (err.code === 'P2025') {
    return res.status(404).json({ status: 'error', message: 'Resource not found' });
  }
  if (err.code === 'P2002') {
    return res.status(409).json({ status: 'error', message: 'Resource already exists' });
  }
  if (err.code === 'P1001') {
    return res.status(503).json({ status: 'error', message: 'Database connection failed' });
  }

  // Validation errors
  if (err.isJoi || err.name === 'ValidationError') {
    return res.status(400).json({
      status: 'error',
      message: 'Invalid input data',
      details: err.details || err.message
    });
  }

  // Generic server error
  res.status(500).json({
    status: 'error',
    message: process.env.NODE_ENV === 'development' 
      ? err.message 
      : 'Internal server error'
  });
};
