import bcrypt from 'bcrypt';

const SALT_ROUNDS = 12;

export const hashPassword = async (password) => {
 if (!password || password.length < 8) {
  throw new Error('Password must be at least 8 characters');
 }
 return bcrypt.hash(password, SALT_ROUNDS);
};

export const verifyPassword = async (password, hash) => {
 return bcrypt.compare(password, hash);
};
