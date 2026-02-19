// utils/hash.js - CREATE THIS FILE
import bcrypt from 'bcryptjs';
import { AppError } from './error.js';

const SALT_ROUNDS = 12;

export const hashPassword = async (password) => {
  if (!password || password.length < 8) {
    throw new AppError('Password must be at least 8 characters', 400);
  }
  
  try {
    const salt = await bcrypt.genSalt(SALT_ROUNDS);
    return await bcrypt.hash(password, salt);
  } catch (error) {
    throw new AppError('Password hashing failed', 500);
  }
};

export const verifyPassword = async (password, hashedPassword) => {
  try {
    return await bcrypt.compare(password, hashedPassword);
  } catch (error) {
    throw new AppError('Password verification failed', 500);
  }
};
