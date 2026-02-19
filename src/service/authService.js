import { hashPassword, verifyPassword } from '../utils/hash.js';
import { generateTokens } from '../utils/token.js';
import { logInfo, logWarn, logError } from '../utils/logger.js';
import { AuthRepository } from '../repository/authRepository.js';
import { AppError } from '../utils/error.js';

export class AuthService {
  constructor() {
    this.repository = new AuthRepository();
  }

  async register(email, password, name, role = 'CUSTOMER') {
    const existingUser = await this.repository.findByEmail(email);
    if (existingUser) {
      throw new AppError('Email already exists', 409);
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

    return {
      user: { 
        id: user.id, 
        email: user.email, 
        name: user.name, 
        role: user.role, 
        emailVerified: true 
      },
      accessToken,
      refreshToken
    };
  }

  async login(email, password) {
    const user = await this.repository.findByEmail(email);

    if (!user || !await verifyPassword(password, user.password)) {
      throw new AppError('Invalid credentials', 401);
    }

    // auto-verified

    const { accessToken, refreshToken } = await generateTokens({
      id: user.id,
      email: user.email,
      role: user.role
    });

    await this.repository.updateRefreshToken(user.id, refreshToken);

    return {
      user: { 
        id: user.id, 
        email: user.email, 
        name: user.name, 
        role: user.role, 
        emailVerified: true 
      },
      accessToken,
      refreshToken
    };
  }
}
