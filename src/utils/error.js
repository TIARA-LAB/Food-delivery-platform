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
 //  DEVELOPMENT MODE: Show FULL error details
 if (process.env.NODE_ENV === 'development') {
  console.error('FULL ERROR DETAILS:', {
   message: err.message,
   stack: err.stack,
   statusCode: err.statusCode,
   name: err.name
  });

  return res.status(err.statusCode || 500).json({
   status: err.status || 'error',
   message: err.message,
   ...(err.stack && { stack: err.stack }),  // Show stack trace
   errorName: err.name
  });
 }

 // PRODUCTION MODE: Hide sensitive details
 err.statusCode = err.statusCode || 500;
 err.status = err.status || 'error';

 if (err.isOperational) {
  return res.status(err.statusCode).json({
   status: err.status,
   message: err.message
  });
 }

 res.status(500).json({
  status: 'error',
  message: 'Internal server error'
 });
};
