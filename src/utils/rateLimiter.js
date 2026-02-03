import rateLimit from 'express-rate-limit';

export const createAuthLimiter = (windowMs = 15 * 60 * 1000, max = 5) =>
 rateLimit({
  windowMs,
  max,
  message: { error: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
 });

export const loginLimiter = createAuthLimiter();
export const registerLimiter = createAuthLimiter(60 * 60 * 1000, 3);
