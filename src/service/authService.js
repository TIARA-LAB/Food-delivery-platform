import { hashPassword, verifyPassword } from '../utils/hash.js';
import { generateTokens } from '../utils/token.js';
import EmailService from './emailService.js';
import { logInfo, logWarn, logError } from '../utils/logger.js';  
import { AuthRepository } from '../repository/authRepository.js';
import { AppError } from '../utils/error.js';
import jwt from 'jsonwebtoken';

export class AuthService {
  constructor() {
    this.repository = new AuthRepository();
  }

  async register(email, password, name, role = 'CUSTOMER') {
    const existingUser = await this.repository.findByEmail(email);
    if (existingUser) {
      throw new AppError('Email already exists', 409);
    }

    if (role === 'ADMIN' && process.env.NODE_ENV === 'production') {
      throw new AppError('Admin registration disabled in production', 403);
    }

    const hashedPassword = await hashPassword(password);
    const user = await this.repository.create({ 
      email, 
      password: hashedPassword, 
      name, 
      role 
    });

    const { accessToken, refreshToken } = await generateTokens({
      id: user.id, 
      email: user.email, 
      role: user.role 
    });

    await this.repository.updateRefreshToken(user.id, refreshToken);

    try {
      await EmailService.sendVerificationEmail(user.id, user.email);
      logInfo(`Verification email sent to: ${email}`);
    } catch (emailError) {
      logWarn(`Failed to send verification email to ${email}:`, emailError);
    }

    return {
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
      accessToken,
      refreshToken,
      emailSent: true
    };
  }

  async login(email, password) {
    const user = await this.repository.findByEmail(email);

    if (!user || !await verifyPassword(password, user.password)) {
      throw new AppError('Invalid credentials', 401);
    }

    if (!user.emailVerified) {
      throw new AppError('Please verify your email before logging in', 403);
    }

    const { accessToken, refreshToken } = await generateTokens({
      id: user.id, 
      email: user.email, 
      role: user.role 
    });

    await this.repository.updateRefreshToken(user.id, refreshToken);

    return {
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
      accessToken,
      refreshToken
    };
  }

  async sendVerificationEmail(email) {
    const user = await this.repository.findByEmail(email);
    if (!user) {
      throw new AppError('User not found', 404);
    }
    return EmailService.sendVerificationEmail(user.id, user.email);
  }

  async verifyEmail(token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_VERIFY_SECRET);
      return this.repository.updateEmailVerified(decoded.id, true);
    } catch (error) {
      throw new AppError('Invalid or expired verification token', 400);
    }
  }
}
